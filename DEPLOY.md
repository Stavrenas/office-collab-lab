# Deploy — Office Collab Lab

Collabora CODE + Euro-Office evaluation harness on the platform VPS.

| | |
|--|--|
| VPS | `77.237.239.74` |
| UI | https://office.77.237.239.74.sslip.io |
| Collabora | https://collabora.77.237.239.74.sslip.io |
| Euro-Office | https://eurooffice.77.237.239.74.sslip.io |
| Compose | `compose.platform.yaml` |
| Deploy path | `/opt/apps/office-collab-lab/src` |
| CI | `.forgejo/workflows/deploy.yml` after GitHub `main` is mirrored |

Infra (Caddy, network): [platform-infra](https://github.com/Stavrenas/platform-infra).

## One-time platform setup

No dedicated Postgres DB or Seaweed bucket (harness uses Docker volumes for documents).

1. App env on the host:

```bash
sudo mkdir -p /opt/apps/office-collab-lab
sudo tee /opt/apps/office-collab-lab/.env >/dev/null <<'EOF'
OFFICE_HOST=office.77.237.239.74.sslip.io
COLLABORA_HOST=collabora.77.237.239.74.sslip.io
EUROOFFICE_HOST=eurooffice.77.237.239.74.sslip.io
LAB_USERS=alice:Alice Evaluator,bob:Bob Evaluator,carol:Carol Evaluator
LAB_SESSION_SECRET=<openssl rand -hex 24>
EO_JWT_SECRET=<openssl rand -hex 32>
COLLABORA_USERNAME=admin
COLLABORA_PASSWORD=<strong password>
EOF
```

2. Caddy site blocks in `platform-infra` `caddy/Caddyfile` for the three hostnames (see that repo). Reload Caddy after sync.

3. Ensure Docker network `platform` exists (`/opt/platform` stack).

## CI deploy

Push to GitHub `main`. Forgejo mirrors the repo, then `.forgejo/workflows/deploy.yml` on the host runner (`platform`) rsyncs to `/opt/apps/office-collab-lab/src` and runs:

```bash
docker compose -f compose.platform.yaml --env-file /opt/apps/office-collab-lab/.env up -d --build
```

## Notes

- Editors call the harness as `http://office-harness:3100` on the Docker network.
- Browsers load Collabora / Euro-Office over the public HTTPS hostnames.
- Combined mem limits ≈ 2.8 GB — keep an eye on Beszel when other apps are busy.
