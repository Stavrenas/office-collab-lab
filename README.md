# Office Collab Lab

Isolated evaluation platform for **Collabora CODE** and **Euro-Office** (ONLYOFFICE was dropped from this lab).

The harness is the application: it owns storage, authorization, WOPI (Collabora), and Docs-API JWT/callback flows (Euro-Office).

## Quick start

```bash
cd office-collab-lab
cp .env.example .env   # if needed
make corpus
make install

make up-both        # Collabora :9980 + Euro-Office :8082
# or one at a time:
# make up-collabora
# make up-eo

make harness        # UI on :3100 (if not using compose harness)
```

Open **http://localhost:3100** — pick Collabora or Euro-Office, then a corpus document.

## What was built

| Piece | Role |
|---|---|
| `docker-compose.yml` | Loopback-bound Collabora + Euro-Office |
| `harness/` | Storage, sessions, WOPI + Docs-API adapters, evidence, UI |
| `corpus/` | Smoke DOCX / XLSX / PPTX + manifest hashes |
| `storage/` | Application-owned files + revision history |
| `evidence/` | JSONL event stream + digest captures |

### Integration

- **Collabora** → WOPI host at `/wopi/files/:id`
- **Euro-Office** → signed Docs API config + `/api/callbacks/eurooffice/:documentId`

## Commands

```bash
make up-both
make down
make digests C=collabora
make digests C=eurooffice
```
