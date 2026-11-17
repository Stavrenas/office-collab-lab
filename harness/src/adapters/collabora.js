const config = require("../config");
const docs = require("../storage/documents");
const { createWopiToken } = require("./tokens");

let cachedEditorBase = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

/**
 * Collabora requires /browser/<productVersionHash>/cool.html — /browser/dist/cool.html
 * triggers "Failed to establish socket connection / reverse proxy may be misconfigured".
 */
async function resolveEditorBaseUrl() {
  const now = Date.now();
  if (cachedEditorBase && now - cachedAt < CACHE_MS) return cachedEditorBase;

  const publicBase = config.collabora.publicUrl.replace(/\/$/, "");
  // Prefer internal URL for discovery (Docker network); browser still gets publicBase
  const discoverBase = (config.collabora.internalUrl || publicBase).replace(/\/$/, "");
  try {
    const capsRes = await fetch(`${discoverBase}/hosting/capabilities`, {
      signal: AbortSignal.timeout(5000),
    });
    if (capsRes.ok) {
      const caps = await capsRes.json();
      const hash = caps.productVersionHash;
      if (hash) {
        cachedEditorBase = `${publicBase}/browser/${hash}/cool.html`;
        cachedAt = now;
        return cachedEditorBase;
      }
    }
  } catch (_) {}

  try {
    const discRes = await fetch(`${discoverBase}/hosting/discovery`, {
      signal: AbortSignal.timeout(5000),
    });
    if (discRes.ok) {
      const xml = await discRes.text();
      const m = xml.match(/urlsrc="([^"]+cool\.html)\?/);
      if (m) {
        // Rewrite discovery host to the browser-facing public URL
        const u = new URL(m[1], publicBase);
        const pub = new URL(publicBase);
        u.protocol = pub.protocol;
        u.host = pub.host;
        cachedEditorBase = u.toString().replace(/\?$/, "");
        cachedAt = now;
        return cachedEditorBase;
      }
    }
  } catch (_) {}

  // Last resort — will usually fail with reverse-proxy error on current CODE
  cachedEditorBase = `${publicBase}/browser/dist/cool.html`;
  cachedAt = now;
  return cachedEditorBase;
}

/**
 * Collabora adapter — application implements WOPI host and embeds the editor.
 */
async function createEditorSession({ documentId, userId, userName, accessMode = "edit", tenantId }) {
  const meta = docs.getDocument(documentId);
  if (!meta) {
    const err = new Error("Document not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (tenantId && meta.tenantId !== tenantId) {
    const err = new Error("Tenant mismatch");
    err.code = "FORBIDDEN";
    throw err;
  }

  const session = createWopiToken({
    documentId,
    userId,
    userName,
    accessMode,
    tenantId: meta.tenantId,
  });

  // WOPISrc must be reachable by Collabora (HARNESS_PUBLIC_URL / aliasgroup host)
  const wopiSrc = `${config.publicUrl}/wopi/files/${encodeURIComponent(documentId)}`;
  const editorBase = await resolveEditorBaseUrl();
  const editorUrl =
    `${editorBase}` +
    `?WOPISrc=${encodeURIComponent(wopiSrc)}` +
    `&access_token=${encodeURIComponent(session.accessToken)}` +
    `&access_token_ttl=0`;

  docs.appendEvidence({
    type: "session.create",
    editor: "collabora",
    documentId,
    userId,
    accessMode: session.accessMode,
    revision: meta.revision,
    editorBase,
  });

  return {
    editor: "collabora",
    document: meta,
    accessMode: session.accessMode,
    accessToken: session.accessToken,
    wopiSrc,
    editorUrl,
    postMessageOrigin: config.browserUrl,
  };
}

function checkFileInfo(session, meta) {
  const canWrite = session.accessMode === "edit";
  return {
    BaseFileName: meta.title,
    Size: meta.size,
    OwnerId: meta.createdBy || "app",
    UserId: session.userId,
    UserFriendlyName: session.userName || session.userId,
    Version: String(meta.revision),
    UserCanWrite: canWrite,
    UserCanNotWriteRelative: true,
    SupportsUpdate: true,
    SupportsLocks: false,
    SupportsGetLock: false,
    SupportsExtendedLockLength: false,
    SupportsDeleteFile: false,
    SupportsRename: false,
    SupportsUserInfo: true,
    LastModifiedTime: meta.updatedAt,
    PostMessageOrigin: config.browserUrl,
  };
}

module.exports = {
  createEditorSession,
  checkFileInfo,
  resolveEditorBaseUrl,
};
