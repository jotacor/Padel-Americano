# syntax=docker/dockerfile:1

# Padel Americano: built frontend + API (server/, Node built-ins only), data as files in /data.

# ---- Build: compile the Vite frontend ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Runtime: no node_modules needed ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8788 \
    DATA_DIR=/data \
    DIST_DIR=/app/dist

RUN mkdir -p /data && chown node:node /data
COPY --chown=node:node types.ts ./
COPY --chown=node:node server ./server
COPY --chown=node:node --from=build /app/dist ./dist

USER node
# Shared tournaments (one JSON file each, expire 24 h after the last update) — mount a volume to keep them
VOLUME /data
EXPOSE 8788

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.ts"]
