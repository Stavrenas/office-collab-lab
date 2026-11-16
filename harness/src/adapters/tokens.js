const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config");

const wopiSessions = new Map();

function createWopiToken({ documentId, userId, userName, accessMode, tenantId }) {
  const accessToken = crypto.randomBytes(24).toString("hex");
  const session = {
    accessToken,
    documentId,
    userId,
    userName,
    accessMode: accessMode === "view" ? "view" : "edit",
    tenantId: tenantId || "default",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  wopiSessions.set(accessToken, session);
  return session;
}

function resolveWopiToken(accessToken) {
  const session = wopiSessions.get(accessToken);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    wopiSessions.delete(accessToken);
    return null;
  }
  return session;
}

function signEditorJwt(payload, secret, expiresIn = "2h") {
  return jwt.sign(payload, secret, { algorithm: "HS256", expiresIn });
}

function verifyEditorJwt(token, secret) {
  return jwt.verify(token, secret, { algorithms: ["HS256"] });
}

function extractBearer(headerValue) {
  if (!headerValue) return null;
  const m = String(headerValue).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : headerValue;
}

function createDownloadToken({ documentId, userId, editor, revision }) {
  return jwt.sign(
    {
      typ: "download",
      documentId,
      userId,
      editor,
      revision: revision || null,
    },
    config.sessionSecret,
    { algorithm: "HS256", expiresIn: "30m" }
  );
}

function verifyDownloadToken(token) {
  const payload = jwt.verify(token, config.sessionSecret, { algorithms: ["HS256"] });
  if (payload.typ !== "download") throw new Error("Invalid download token");
  return payload;
}

module.exports = {
  createWopiToken,
  resolveWopiToken,
  signEditorJwt,
  verifyEditorJwt,
  extractBearer,
  createDownloadToken,
  verifyDownloadToken,
};
