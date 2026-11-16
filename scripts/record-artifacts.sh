#!/usr/bin/env bash
# Record pinned image digests and run metadata for a candidate.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVIDENCE="${ROOT}/evidence"
mkdir -p "${EVIDENCE}"

CANDIDATE="${1:-}"
if [[ -z "${CANDIDATE}" ]]; then
  echo "Usage: $0 <collabora|eurooffice>"
  exit 1
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${EVIDENCE}/artifacts-${CANDIDATE}-${TS}.txt"

case "${CANDIDATE}" in
  collabora) IMAGE="collabora/code:latest"; CONTAINER="eval-collabora" ;;
  eurooffice) IMAGE="ghcr.io/euro-office/documentserver:latest"; CONTAINER="eval-eurooffice" ;;
  *) echo "Unknown candidate: ${CANDIDATE}"; exit 1 ;;
esac

{
  echo "candidate: ${CANDIDATE}"
  echo "edition: community/lab"
  echo "image_reference: ${IMAGE}"
  echo "image_digest: $(docker image inspect "${IMAGE}" --format '{{json .RepoDigests}}' 2>/dev/null || echo 'image not pulled')"
  echo "container: ${CONTAINER}"
  echo "container_status: $(docker inspect -f '{{.State.Status}}' "${CONTAINER}" 2>/dev/null || echo 'not running')"
  echo "host_os_and_kernel: $(uname -srm)"
  echo "docker_version: $(docker --version)"
  echo "test_timestamp: ${TS}"
  echo "configuration: ${ROOT}/docker-compose.yml + ${ROOT}/.env"
  echo "corpus_manifest: ${ROOT}/corpus/MANIFEST.json"
} | tee "${OUT}"

echo "Wrote ${OUT}"
