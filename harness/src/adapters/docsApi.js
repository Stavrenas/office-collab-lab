const config = require("../config");
const docs = require("../storage/documents");
const { signEditorJwt, createDownloadToken } = require("./tokens");

/**
 * Docs-API style adapter for Euro-Office (JWT bootstrap + save callbacks).
 */

const FILE_TYPE_MAP = {
  word: "word",
  cell: "cell",
  slide: "slide",
  pdf: "pdf",
};

// Docs-API accepted extensions (client rejects anything else)
const SUPPORTED_FILE_TYPES = new Set([
  "doc",
  "docm",
  "docx",
  "dot",
  "dotm",
  "dotx",
  "epub",
  "fb2",
  "fodt",
  "html",
  "mht",
  "odt",
  "ott",
  "rtf",
  "stw",
  "sxw",
  "txt",
  "wps",
  "wpt",
  "xml",
  "csv",
  "et",
  "ett",
  "fods",
  "ods",
  "ots",
  "sxc",
  "xls",
  "xlsb",
  "xlsm",
  "xlsx",
  "xlt",
  "xltm",
  "xltx",
  "dps",
  "dpt",
  "fodp",
  "odp",
  "otp",
  "pot",
  "potm",
  "potx",
  "pps",
  "ppsm",
  "ppsx",
  "ppt",
  "pptm",
  "pptx",
  "sxi",
  "pdf",
  "djvu",
  "xps",
  "oxps",
]);

function editorConfigFor(engineId) {
  if (engineId !== "eurooffice") {
    const err = new Error(`Unsupported Docs-API engine: ${engineId}`);
    err.code = "CONFIG";
    throw err;
  }
  return config.eurooffice;
}

/**
 * Document keys must be unique per document revision for co-edit sessions,
 * and must not collide across tenants. Rotate on durable save, not every refresh.
 */
function documentKey(meta) {
  return `${meta.tenantId}.${meta.id}.rev${meta.revision}`;
}

function createEditorSession({
  engineId,
  documentId,
  userId,
  userName,
  accessMode = "edit",
  tenantId,
}) {
  const engine = editorConfigFor(engineId);
  if (!engine.jwtSecret) {
    const err = new Error(`${engine.label} JWT secret is not configured`);
    err.code = "CONFIG";
    throw err;
  }

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

  const fileType = String(meta.fileType || "").toLowerCase().replace(/^\./, "");
  if (!SUPPORTED_FILE_TYPES.has(fileType)) {
    const err = new Error(
      `Unsupported document.fileType "${fileType}". Use docx/xlsx/pptx (or another Docs-API type).`
    );
    err.code = "UNSUPPORTED_TYPE";
    throw err;
  }

  const mode = accessMode === "view" ? "view" : "edit";
  const downloadToken = createDownloadToken({
    documentId: meta.id,
    userId,
    editor: engineId,
    revision: meta.revision,
  });

  // Editors fetch the file from the harness; use publicUrl reachable from the container
  const documentUrl = `${config.publicUrl}/api/files/${meta.id}/content?token=${encodeURIComponent(downloadToken)}`;
  const callbackUrl = `${config.publicUrl}/api/callbacks/${engineId}/${meta.id}`;

  // Title must include a valid extension — DocsAPI uses it as a fallback signal
  let title = meta.title || `document.${fileType}`;
  if (!title.toLowerCase().endsWith(`.${fileType}`)) {
    title = `${title}.${fileType}`;
  }

  const editorConfig = {
    documentType: FILE_TYPE_MAP[meta.documentType] || "word",
    document: {
      fileType,
      key: documentKey(meta),
      title,
      url: documentUrl,
      permissions: {
        edit: mode === "edit",
        download: true,
        print: true,
        review: mode === "edit",
        comment: true,
        chat: false,
      },
    },
    editorConfig: {
      callbackUrl,
      mode,
      lang: "en",
      user: {
        id: String(userId),
        name: userName || userId,
      },
      customization: {
        forcesave: true,
        autosave: true,
        compactHeader: true,
      },
    },
  };

  // JWT payload must match the config object fields (without token itself)
  const token = signEditorJwt(editorConfig, engine.jwtSecret);
  const launch = {
    ...editorConfig,
    token,
  };

  docs.appendEvidence({
    type: "session.create",
    editor: engineId,
    documentId: meta.id,
    userId,
    accessMode: mode,
    revision: meta.revision,
    documentKey: documentKey(meta),
  });

  return {
    editor: engineId,
    document: meta,
    accessMode: mode,
    documentKey: documentKey(meta),
    apiScriptUrl: `${engine.publicUrl}${engine.apiScript}`,
    editorServerUrl: engine.publicUrl,
    config: launch,
  };
}

/**
 * Handle Docs-API callback statuses:
 * 1 editing, 2 ready to save, 3 save error, 4 closed no changes,
 * 6 force-save, 7 force-save error
 */
async function handleCallback(engineId, documentId, body, { userId } = {}) {
  const status = Number(body.status);
  const engine = editorConfigFor(engineId);
  const meta = docs.getDocument(documentId);
  if (!meta) {
    return { error: 1, message: "document not found" };
  }

  docs.appendEvidence({
    type: "callback.received",
    editor: engineId,
    documentId,
    status,
    key: body.key,
    users: body.users,
    urlPresent: Boolean(body.url),
  });

  if (status === 1 || status === 4) {
    return { error: 0 };
  }

  if (status === 3 || status === 7) {
    docs.appendEvidence({
      type: "callback.save_error",
      editor: engineId,
      documentId,
      status,
      body,
    });
    return { error: 0 };
  }

  if (status === 2 || status === 6) {
    if (!body.url) {
      return { error: 1, message: "missing url" };
    }

    // Download only from the approved editor-server origin
    const allowedOrigins = [engine.publicUrl, engine.internalUrl].map((u) => new URL(u).origin);
    let parsed;
    try {
      parsed = new URL(body.url);
    } catch {
      return { error: 1, message: "invalid url" };
    }
    // Allow docker-internal hostnames that resolve to the same service
    const hostOk =
      allowedOrigins.includes(parsed.origin) ||
      ["eurooffice", "localhost", "127.0.0.1"].includes(parsed.hostname);

    if (!hostOk) {
      docs.appendEvidence({
        type: "callback.ssrf_blocked",
        editor: engineId,
        documentId,
        url: body.url,
      });
      return { error: 1, message: "url origin not allowed" };
    }

    // Prefer internal URL host when the callback used a public localhost URL
    // that the harness container cannot reach — rewrite to internal service.
    let fetchUrl = body.url;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const internal = new URL(engine.internalUrl);
      parsed.protocol = internal.protocol;
      parsed.host = internal.host;
      fetchUrl = parsed.toString();
    }

    const response = await fetch(fetchUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      docs.appendEvidence({
        type: "callback.download_failed",
        editor: engineId,
        documentId,
        statusCode: response.status,
      });
      return { error: 1, message: "download failed" };
    }

    const arrayBuf = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuf);
    if (bytes.length > 100 * 1024 * 1024) {
      return { error: 1, message: "file too large" };
    }

    const reason = status === 6 ? "forcesave" : "save";
    const updated = docs.persistDocument(documentId, bytes, {
      by: userId || (body.users && body.users[0]) || "editor",
      reason,
      metadata: {
        editor: engineId,
        callbackStatus: status,
        editorKey: body.key,
        contentHash: docs.sha256(bytes),
      },
    });

    docs.appendEvidence({
      type: "callback.persisted",
      editor: engineId,
      documentId,
      status,
      revision: updated.revision,
      hash: updated.hash,
      size: updated.size,
    });

    // Success means bytes are durably committed
    return { error: 0, revision: updated.revision, hash: updated.hash };
  }

  return { error: 0 };
}

module.exports = {
  createEditorSession,
  handleCallback,
  documentKey,
  editorConfigFor,
};
