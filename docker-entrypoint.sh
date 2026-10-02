#!/bin/sh
set -e

# Optional: enables AI nicknames (/api/nicknames)
if [ -n "$ANTHROPIC_API_KEY" ]; then
  set -- --binding "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" "$@"
fi

exec wrangler pages dev dist \
  --ip 0.0.0.0 \
  --port "${PORT:-8788}" \
  --persist-to /data \
  --show-interactive-dev-session=false \
  "$@"
