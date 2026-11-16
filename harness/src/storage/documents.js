const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { nanoid } = require("nanoid");
const config = require("../config");

const EXT_TO_TYPE = {
  docx: "word",
  doc: "word",
  odt: "word",
  rtf: "word",
  txt: "word",
  xlsx: "cell",
  xls: "cell",
  ods: "cell",
  csv: "cell",
  pptx: "slide",
  ppt: "slide",
  odp: "slide",
  pdf: "pdf",
};

function ensureDirs() {
  for (const dir of [
    config.storageRoot,
    config.corpusRoot,
    config.evidenceRoot,
    path.join(config.storageRoot, "files"),
    path.join(config.storageRoot, "revisions"),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(config.metaDbPath)) {
    fs.writeFileSync(config.metaDbPath, JSON.stringify({ documents: {} }, null, 2));
  }
}

function readDb() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(config.metaDbPath, "utf8"));
}

function writeDb(db) {
  ensureDirs();
  const tmp = `${config.metaDbPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, config.metaDbPath);
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function filePathFor(docId, revision) {
  if (revision == null) {
    return path.join(config.storageRoot, "files", `${docId}.bin`);
  }
  return path.join(config.storageRoot, "revisions", docId, `r${revision}.bin`);
}

function getDocumentType(fileType) {
  return EXT_TO_TYPE[String(fileType || "").toLowerCase()] || "word";
}

function listDocuments({ tenantId } = {}) {
  const db = readDb();
  return Object.values(db.documents)
    .filter((d) => !tenantId || d.tenantId === tenantId)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function getDocument(docId) {
  const db = readDb();
  return db.documents[docId] || null;
}

function createDocument({
  title,
  fileType,
  buffer,
  tenantId = "default",
  source = "upload",
  createdBy = "system",
}) {
  ensureDirs();
  const id = nanoid(12);
  const revision = 1;
  const hash = sha256(buffer);
  const meta = {
    id,
    title: title || `document.${fileType}`,
    fileType: String(fileType || "docx").toLowerCase(),
    documentType: getDocumentType(fileType),
    tenantId,
    revision,
    size: buffer.length,
    hash,
    source,
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        revision,
        hash,
        size: buffer.length,
        at: new Date().toISOString(),
        by: createdBy,
        reason: "create",
      },
    ],
  };

  fs.writeFileSync(filePathFor(id), buffer);
  fs.mkdirSync(path.join(config.storageRoot, "revisions", id), { recursive: true });
  fs.writeFileSync(filePathFor(id, revision), buffer);

  const db = readDb();
  db.documents[id] = meta;
  writeDb(db);
  return meta;
}

function readDocumentBytes(docId, revision) {
  const meta = getDocument(docId);
  if (!meta) return null;
  const rev = revision == null ? meta.revision : Number(revision);
  const p = revision == null ? filePathFor(docId) : filePathFor(docId, rev);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

/**
 * Atomically persist a new revision.
 * expectedRevision: if provided, reject when current revision differs (optimistic concurrency).
 */
function persistDocument(docId, bytes, { expectedRevision, by = "editor", reason = "save", metadata = {} } = {}) {
  const db = readDb();
  const meta = db.documents[docId];
  if (!meta) {
    const err = new Error("Document not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (expectedRevision != null && Number(expectedRevision) !== Number(meta.revision)) {
    const err = new Error(
      `Revision conflict: expected ${expectedRevision}, current ${meta.revision}`
    );
    err.code = "CONFLICT";
    err.currentRevision = meta.revision;
    throw err;
  }

  const nextRevision = meta.revision + 1;
  const hash = sha256(bytes);
  const revDir = path.join(config.storageRoot, "revisions", docId);
  fs.mkdirSync(revDir, { recursive: true });

  const revPath = filePathFor(docId, nextRevision);
  const currentPath = filePathFor(docId);
  const tmp = `${currentPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.copyFileSync(tmp, revPath);
  fs.renameSync(tmp, currentPath);

  meta.revision = nextRevision;
  meta.size = bytes.length;
  meta.hash = hash;
  meta.updatedAt = new Date().toISOString();
  meta.history = meta.history || [];
  meta.history.push({
    revision: nextRevision,
    hash,
    size: bytes.length,
    at: meta.updatedAt,
    by,
    reason,
    ...metadata,
  });
  db.documents[docId] = meta;
  writeDb(db);
  return meta;
}

function seedFromCorpus() {
  ensureDirs();
  const allowExt = new Set(Object.keys(EXT_TO_TYPE));
  const files = fs.existsSync(config.corpusRoot)
    ? fs
        .readdirSync(config.corpusRoot)
        .filter((f) => !f.startsWith(".") && f !== "MANIFEST.json")
        .filter((f) => allowExt.has(path.extname(f).slice(1).toLowerCase()))
    : [];
  const existing = listDocuments();
  const seeded = [];
  for (const file of files) {
    const title = file;
    if (existing.some((d) => d.title === title && d.source === "corpus")) continue;
    const ext = path.extname(file).slice(1).toLowerCase() || "docx";
    const buffer = fs.readFileSync(path.join(config.corpusRoot, file));
    seeded.push(
      createDocument({
        title,
        fileType: ext,
        buffer,
        source: "corpus",
        createdBy: "seed",
      })
    );
  }
  return seeded;
}

function appendEvidence(event) {
  ensureDirs();
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(config.evidenceRoot, `events-${day}.jsonl`);
  const line = JSON.stringify({ ...event, at: new Date().toISOString() });
  fs.appendFileSync(file, `${line}\n`);
}

function deleteDocument(docId) {
  const db = readDb();
  const meta = db.documents[docId];
  if (!meta) return false;
  delete db.documents[docId];
  writeDb(db);
  for (const p of [filePathFor(docId), path.join(config.storageRoot, "revisions", docId)]) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (_) {}
  }
  return true;
}

function resetDocuments() {
  ensureDirs();
  writeDb({ documents: {} });
  fs.rmSync(path.join(config.storageRoot, "files"), { recursive: true, force: true });
  fs.rmSync(path.join(config.storageRoot, "revisions"), { recursive: true, force: true });
  fs.mkdirSync(path.join(config.storageRoot, "files"), { recursive: true });
  fs.mkdirSync(path.join(config.storageRoot, "revisions"), { recursive: true });
  return seedFromCorpus();
}

function isEditorFileType(fileType) {
  return Object.prototype.hasOwnProperty.call(EXT_TO_TYPE, String(fileType || "").toLowerCase());
}

module.exports = {
  ensureDirs,
  listDocuments,
  getDocument,
  createDocument,
  readDocumentBytes,
  persistDocument,
  seedFromCorpus,
  appendEvidence,
  deleteDocument,
  resetDocuments,
  isEditorFileType,
  getDocumentType,
  sha256,
  EXT_TO_TYPE,
};
