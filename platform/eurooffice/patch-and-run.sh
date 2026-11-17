#!/bin/bash
# Allow the harness UI origin to embed Euro-Office editor iframes.
set -euo pipefail

ORIGIN="${FRAME_ANCESTORS_ORIGIN:-https://office.77.237.239.74.sslip.io}"
CSP="frame-ancestors ${ORIGIN} 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'"

for conf in \
  /etc/nginx/includes/ds-docservice.conf \
  /etc/euro-office/documentserver/nginx/includes/ds-docservice.conf
do
  if [ -f "$conf" ]; then
    # Replace the editor-page CSP header (idempotent-ish)
    sed -i \
      -e "s#add_header Content-Security-Policy \"frame-ancestors[^\"]*\" always;#add_header Content-Security-Policy \"${CSP}\" always;#g" \
      -e "s#add_header Content-Security-Policy \"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'\" always;#add_header Content-Security-Policy \"${CSP}\" always;#g" \
      "$conf"
    echo "Patched CSP in $conf -> frame-ancestors ${ORIGIN}"
  fi
done

exec /entrypoint.sh "$@"
