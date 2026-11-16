const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const docs = require("../storage/documents");
const collabora = require("../adapters/collabora");
const docsApi = require("../adapters/docsApi");
const {
  createDownloadToken,
  verifyDownloadToken,
  extractBearer,
  verifyEditorJwt,
} = require("../adapters/tokens");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function currentUser(req) {
  return req.labUser || { id: "anonymous", name: "Anonymous" };
}

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "office-collab-lab-harness",
    publicUrl: config.publicUrl,
    browserUrl: config.browserUrl,
    engines: {
      collabora: config.collabora.publicUrl,
      eurooffice: config.eurooffice.publicUrl,
    },
  });
});

router.get("/users", (_req, res) => {
  res.json({ users: config.users });
});

async function probeEngine(id) {
  try {
    if (id === "collabora") {
      const r = await fetch(config.collabora.publicUrl + "/", {
        signal: AbortSignal.timeout(4000),
      });
      const text = (await r.text()).trim();
      return { ok: r.ok && text === "OK", detail: text.slice(0, 80) || `HTTP ${r.status}` };
    }
    if (id === "eurooffice") {
      const engine = config.eurooffice;
      const api = await fetch(`${engine.publicUrl}${engine.apiScript}`, {
        signal: AbortSignal.timeout(4000),
      });
      // DocService health — static api.js can be 200 while backend is dead
      const health = await fetch(`${engine.publicUrl}/healthcheck`, {
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);
      const healthText = health ? (await health.text()).trim() : "unreachable";
      const backendOk = Boolean(health && health.ok && /true/i.test(healthText));
      return {
        ok: api.ok && backendOk,
        detail: api.ok
          ? backendOk
            ? "api+docservice ok"
            : `api ok, docservice unhealthy (${healthText || health.status})`
          : `api HTTP ${api.status}`,
      };
    }
  } catch (err) {
    return { ok: false, detail: err.message };
  }
  return { ok: false, detail: "unknown engine" };
}

router.get("/engines", async (_req, res) => {
  const base = [
    {
      id: "collabora",
      label: config.collabora.label,
      publicUrl: config.collabora.publicUrl,
      integration: "WOPI",
      example: null,
    },
    {
      id: "eurooffice",
      label: config.eurooffice.label,
      publicUrl: config.eurooffice.publicUrl,
      integration: "Docs API + JWT callback",
      example: `${config.eurooffice.publicUrl}/welcome/`,
    },
  ];
  const engines = await Promise.all(
    base.map(async (e) => {
      const probe = await probeEngine(e.id);
      return { ...e, ready: probe.ok, status: probe.detail };
    })
  );
  res.json({ engines });
});

router.get("/documents", (req, res) => {
  const tenantId = req.query.tenantId || "default";
  const documents = docs
    .listDocuments({ tenantId })
    .filter((d) => docs.isEditorFileType(d.fileType));
  res.json({ documents });
});

router.get("/documents/:id", (req, res) => {
  const meta = docs.getDocument(req.params.id);
  if (!meta) return res.status(404).json({ error: "not found" });
  res.json({ document: meta });
});

router.post("/documents", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  const user = currentUser(req);
  const ext = (path.extname(req.file.originalname).slice(1) || req.body.fileType || "docx").toLowerCase();
  const meta = docs.createDocument({
    title: req.body.title || req.file.originalname,
    fileType: ext,
    buffer: req.file.buffer,
    tenantId: req.body.tenantId || "default",
    source: "upload",
    createdBy: user.id,
  });
  docs.appendEvidence({
    type: "document.uploaded",
    documentId: meta.id,
    userId: user.id,
    hash: meta.hash,
    size: meta.size,
  });
  res.status(201).json({ document: meta });
});

router.post("/documents/seed", (_req, res) => {
  const seeded = docs.seedFromCorpus();
  res.json({ seeded: seeded.length, documents: seeded });
});

router.post("/documents/reset", (_req, res) => {
  const seeded = docs.resetDocuments();
  docs.appendEvidence({ type: "documents.reset", seeded: seeded.length });
  res.json({ seeded: seeded.length, documents: docs.listDocuments().filter((d) => docs.isEditorFileType(d.fileType)) });
});

router.delete("/documents/:id", (req, res) => {
  const ok = docs.deleteDocument(req.params.id);
  if (!ok) return res.status(404).json({ error: "not found" });
  docs.appendEvidence({ type: "document.deleted", documentId: req.params.id });
  res.json({ ok: true });
});

router.get("/files/:id/content", (req, res) => {
  try {
    const payload = verifyDownloadToken(req.query.token);
    if (payload.documentId !== req.params.id) {
      return res.status(403).json({ error: "token/document mismatch" });
    }
    const bytes = docs.readDocumentBytes(req.params.id, payload.revision || undefined);
    if (!bytes) return res.status(404).json({ error: "not found" });
    const meta = docs.getDocument(req.params.id);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${meta.title}"`);
    res.send(bytes);
  } catch (err) {
    docs.appendEvidence({ type: "download.rejected", documentId: req.params.id, message: err.message });
    return res.status(401).json({ error: "invalid download token" });
  }
});

router.post("/sessions", async (req, res) => {
  const { editor, documentId, accessMode = "edit", tenantId = "default" } = req.body || {};
  const user = currentUser(req);
  if (!editor || !documentId) {
    return res.status(400).json({ error: "editor and documentId required" });
  }

  try {
    let session;
    if (editor === "collabora") {
      session = await collabora.createEditorSession({
        documentId,
        userId: user.id,
        userName: user.name,
        accessMode,
        tenantId,
      });
    } else if (editor === "eurooffice") {
      session = docsApi.createEditorSession({
        engineId: editor,
        documentId,
        userId: user.id,
        userName: user.name,
        accessMode,
        tenantId,
      });
    } else {
      return res.status(400).json({ error: `unknown editor: ${editor}` });
    }
    res.json({ session });
  } catch (err) {
    const status =
      err.code === "NOT_FOUND"
        ? 404
        : err.code === "FORBIDDEN"
          ? 403
          : err.code === "UNSUPPORTED_TYPE"
            ? 400
            : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

router.post("/callbacks/:engine/:documentId", async (req, res) => {
  const { engine, documentId } = req.params;
  if (engine !== "eurooffice") {
    return res.status(400).json({ error: 1 });
  }

  const engineCfg = docsApi.editorConfigFor(engine);
  const token =
    req.body?.token ||
    extractBearer(req.headers.authorization) ||
    req.query.token;

  try {
    if (token) {
      verifyEditorJwt(token, engineCfg.jwtSecret);
    } else if (engineCfg.jwtSecret) {
      // JWT required when configured — reject unsigned callbacks
      docs.appendEvidence({
        type: "callback.auth_missing",
        editor: engine,
        documentId,
      });
      return res.status(401).json({ error: 1 });
    }
  } catch (err) {
    docs.appendEvidence({
      type: "callback.auth_rejected",
      editor: engine,
      documentId,
      message: err.message,
    });
    return res.status(401).json({ error: 1 });
  }

  try {
    const result = await docsApi.handleCallback(engine, documentId, req.body || {});
    // Return documented {"error":0} only when handled successfully
    res.json({ error: result.error || 0 });
  } catch (err) {
    docs.appendEvidence({
      type: "callback.exception",
      editor: engine,
      documentId,
      message: err.message,
      code: err.code,
    });
    // Do not acknowledge success if bytes were not committed
    res.status(500).json({ error: 1 });
  }
});

router.get("/evidence/recent", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(config.evidenceRoot, `events-${day}.jsonl`);
  if (!fs.existsSync(file)) return res.json({ events: [] });
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  const events = lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line };
    }
  });
  res.json({ events: events.reverse() });
});

router.get("/artifacts/template", (_req, res) => {
  res.type("text").send(`candidate:
edition:
application_version:
image_reference:
image_digest:
source_revision:
host_os_and_kernel:
cpu_and_memory_limits:
browser_and_version:
font_inventory:
configuration_commit:
corpus_commit:
test_timestamp: ${new Date().toISOString()}
`);
});

module.exports = router;
