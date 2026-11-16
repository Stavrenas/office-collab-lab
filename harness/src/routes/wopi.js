const express = require("express");
const docs = require("../storage/documents");
const collabora = require("../adapters/collabora");
const { resolveWopiToken } = require("../adapters/tokens");

const router = express.Router();

function requireWopiAuth(req, res, next) {
  const token = req.query.access_token || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  const session = resolveWopiToken(token);
  if (!session) {
    docs.appendEvidence({ type: "wopi.auth_rejected", path: req.path });
    return res.status(401).json({ error: "invalid or expired access token" });
  }
  if (session.documentId !== req.params.fileId) {
    docs.appendEvidence({
      type: "wopi.wrong_document",
      tokenDoc: session.documentId,
      pathDoc: req.params.fileId,
    });
    return res.status(403).json({ error: "token does not match document" });
  }
  req.wopi = session;
  next();
}

// CheckFileInfo
router.get("/files/:fileId", requireWopiAuth, (req, res) => {
  const meta = docs.getDocument(req.params.fileId);
  if (!meta) return res.status(404).json({ error: "not found" });
  if (meta.tenantId !== req.wopi.tenantId) {
    return res.status(403).json({ error: "tenant mismatch" });
  }
  const info = collabora.checkFileInfo(req.wopi, meta);
  docs.appendEvidence({
    type: "wopi.checkFileInfo",
    documentId: meta.id,
    userId: req.wopi.userId,
    userCanWrite: info.UserCanWrite,
  });
  res.json(info);
});

// GetFile
router.get("/files/:fileId/contents", requireWopiAuth, (req, res) => {
  const meta = docs.getDocument(req.params.fileId);
  if (!meta) return res.status(404).end();
  const bytes = docs.readDocumentBytes(meta.id);
  if (!bytes) return res.status(404).end();
  docs.appendEvidence({
    type: "wopi.getFile",
    documentId: meta.id,
    userId: req.wopi.userId,
    size: bytes.length,
    hash: meta.hash,
  });
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", bytes.length);
  res.send(bytes);
});

// PutFile
router.post("/files/:fileId/contents", requireWopiAuth, express.raw({ type: "*/*", limit: "100mb" }), (req, res) => {
  if (req.wopi.accessMode !== "edit") {
    docs.appendEvidence({
      type: "wopi.putFile.denied",
      documentId: req.params.fileId,
      userId: req.wopi.userId,
    });
    return res.status(403).json({ error: "read-only session" });
  }
  const meta = docs.getDocument(req.params.fileId);
  if (!meta) return res.status(404).json({ error: "not found" });

  const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
  try {
    const updated = docs.persistDocument(meta.id, bytes, {
      by: req.wopi.userId,
      reason: "wopi.putFile",
      metadata: {
        editor: "collabora",
        contentHash: docs.sha256(bytes),
      },
    });
    docs.appendEvidence({
      type: "wopi.putFile",
      documentId: meta.id,
      userId: req.wopi.userId,
      revision: updated.revision,
      hash: updated.hash,
      size: updated.size,
    });
    res.setHeader("X-WOPI-ItemVersion", String(updated.revision));
    res.json({
      LastModifiedTime: updated.updatedAt,
      ItemVersion: String(updated.revision),
    });
  } catch (err) {
    docs.appendEvidence({
      type: "wopi.putFile.error",
      documentId: req.params.fileId,
      message: err.message,
      code: err.code,
    });
    if (err.code === "CONFLICT") return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
