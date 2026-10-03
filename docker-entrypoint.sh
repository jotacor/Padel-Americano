#!/bin/sh
set -e

exec wrangler pages dev dist \
  --ip 0.0.0.0 \
  --port "${PORT:-8788}" \
  --persist-to /data \
  --show-interactive-dev-session=false \
  "$@"
