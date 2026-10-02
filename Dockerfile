# syntax=docker/dockerfile:1

# Self-hosted Padel Americano: static frontend + Pages Functions (/api/*) + local KV,
# served by `wrangler pages dev` (workerd runtime, same as Cloudflare Pages).

# ---- Build: compile the Vite frontend ----
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:24-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    WRANGLER_SEND_METRICS=false \
    PORT=8788

# Wrangler pinned to the lockfile version (workerd needs glibc, hence the non-alpine base)
COPY package-lock.json ./
RUN npm install -g --no-audit --no-fund \
      "wrangler@$(node -p "require('./package-lock.json').packages['node_modules/wrangler'].version")" \
    && npm cache clean --force \
    && rm package-lock.json \
    && mkdir -p /data \
    && chown node:node /app /data

# Functions are bundled at startup and import shared code from the repo root (types.ts, utils/)
COPY --chown=node:node wrangler.toml types.ts ./
COPY --chown=node:node utils ./utils
COPY --chown=node:node functions ./functions
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/

USER node
# KV data (shared tournaments, 24h TTL) — mount a volume to keep it across restarts
VOLUME /data
EXPOSE 8788

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
