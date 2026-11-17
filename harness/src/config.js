const path = require("path");
const fs = require("fs");

// Load .env from project root when running harness on the host
const rootEnv = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
} else {
  require("dotenv").config();
}

function parseUsers(raw) {
  return String(raw || "alice:Alice Evaluator")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, ...rest] = entry.split(":");
      return { id: id.trim(), name: (rest.join(":") || id).trim() };
    });
}

const projectRoot = path.resolve(__dirname, "../..");

const config = {
  port: Number(process.env.HARNESS_PORT || 3100),
  // URL editors use to reach this harness (download/callback/WOPI)
  publicUrl: (process.env.HARNESS_PUBLIC_URL || "http://host.docker.internal:3100").replace(/\/$/, ""),
  // URL browsers use
  browserUrl: (process.env.HARNESS_BROWSER_URL || "http://localhost:3100").replace(/\/$/, ""),
  sessionSecret: process.env.LAB_SESSION_SECRET || "dev-session-secret",
  users: parseUsers(process.env.LAB_USERS),
  storageRoot: process.env.STORAGE_ROOT || path.join(projectRoot, "storage"),
  corpusRoot: process.env.CORPUS_ROOT || path.join(projectRoot, "corpus"),
  evidenceRoot: process.env.EVIDENCE_ROOT || path.join(projectRoot, "evidence"),
  metaDbPath:
    process.env.META_DB_PATH ||
    path.join(
      process.env.STORAGE_ROOT || path.join(projectRoot, "storage"),
      "documents.json"
    ),
  eurooffice: {
    id: "eurooffice",
    label: "Euro-Office",
    publicUrl: (process.env.EO_PUBLIC_URL || "http://localhost:8082").replace(/\/$/, ""),
    internalUrl: (process.env.EO_INTERNAL_URL || "http://eurooffice").replace(/\/$/, ""),
    jwtSecret: process.env.EO_JWT_SECRET || "",
    apiScript: "/web-apps/apps/api/documents/api.js",
  },
  collabora: {
    id: "collabora",
    label: "Collabora CODE",
    publicUrl: (process.env.COLLABORA_PUBLIC_URL || "http://localhost:9980").replace(/\/$/, ""),
    internalUrl: (process.env.COLLABORA_INTERNAL_URL || "http://collabora:9980").replace(/\/$/, ""),
    aliasgroup: process.env.COLLABORA_ALIASGROUP || "http://host.docker.internal:3100",
  },
};

module.exports = config;
