// HTTP app: the shared-tournament API (/api/game) + the built frontend (dist/) with SPA fallback.
// Node built-ins only (no runtime dependencies).
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Tournament } from '../types.ts';
import { generateToken, hashSecret, verifySecret } from './secret.ts';
import { TTL_MS, isValidId, type SharedTournament, type Store } from './store.ts';
import { randomWordId } from './words.ts';

export const MAX_BODY_BYTES = 512 * 1024;
const ID_ATTEMPTS = 5;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

/** `{ tournament }` request body: 413 if too big, 400 if malformed */
const readTournamentBody = async (req: IncomingMessage): Promise<Tournament> => {
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) throw new HttpError(413, 'Tournament too large');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Tournament too large');
    chunks.push(chunk);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
  const tournament = (body as { tournament?: Tournament } | null)?.tournament;
  if (!tournament || !Array.isArray(tournament.players) || !Array.isArray(tournament.rounds)) {
    throw new HttpError(400, 'Tournament data is required');
  }
  return tournament;
};

const publicView = (s: SharedTournament) => ({ id: s.id, tournament: s.tournament, createdAt: s.createdAt, expiresAt: s.expiresAt });

export interface AppOptions {
  store: Store;
  distDir: string;
  now?: () => number;
}

export const createApp = ({ store, distDir, now = Date.now }: AppOptions) => {
  const expiresAt = () => new Date(now() + TTL_MS).toISOString();

  /** Loads the share and checks the write token (header X-Tournament-Pin) */
  const authorize = async (req: IncomingMessage, id: string): Promise<SharedTournament> => {
    const secret = req.headers['x-tournament-pin'];
    if (typeof secret !== 'string' || !secret) throw new HttpError(401, 'PIN is required');
    const shared = await store.get(id);
    if (!shared) throw new HttpError(404, 'Tournament not found');
    if (!(await verifySecret(secret, shared.pinHash))) throw new HttpError(403, 'Invalid PIN');
    return shared;
  };

  const api = async (req: IncomingMessage, res: ServerResponse, pathname: string) => {
    if (pathname === '/api/health') return sendJson(res, 200, { ok: true });

    if (pathname === '/api/game') {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
      const tournament = await readTournamentBody(req);
      let id = '';
      for (let i = 0; i < ID_ATTEMPTS * 2 && !id; i++) {
        const candidate = randomWordId(i >= ID_ATTEMPTS);
        if (!(await store.exists(candidate))) id = candidate;
      }
      if (!id) throw new HttpError(500, 'Could not generate a unique game ID');
      const token = generateToken();
      await store.put({ id, pinHash: await hashSecret(token), tournament, createdAt: new Date(now()).toISOString(), expiresAt: expiresAt() });
      return sendJson(res, 201, { id, pin: token, shareUrl: `/game/${id}` });
    }

    const match = pathname.match(/^\/api\/game\/([^/]+)$/);
    if (!match) throw new HttpError(404, 'Not found');
    const id = decodeURIComponent(match[1]);
    if (!isValidId(id)) throw new HttpError(404, 'Tournament not found');

    if (req.method === 'GET') {
      const shared = await store.get(id);
      if (!shared) throw new HttpError(404, 'Tournament not found');
      return sendJson(res, 200, publicView(shared));
    }
    if (req.method === 'PUT') {
      // Each update keeps the share alive 24 h more
      const shared = await authorize(req, id);
      shared.tournament = await readTournamentBody(req);
      shared.expiresAt = expiresAt();
      await store.put(shared);
      return sendJson(res, 200, publicView(shared));
    }
    if (req.method === 'DELETE') {
      await authorize(req, id);
      await store.remove(id);
      return sendJson(res, 200, { success: true });
    }
    throw new HttpError(405, 'Method not allowed');
  };

  let indexHtml: string | null = null;
  /** index.html with absolute og:image URLs (link-preview crawlers need them) */
  const sendIndex = async (req: IncomingMessage, res: ServerResponse) => {
    indexHtml ??= await readFile(path.join(distDir, 'index.html'), 'utf8');
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
    const origin = `${proto}://${req.headers.host ?? 'localhost'}`;
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES['.html'], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : indexHtml.replace(/content="\/og-image\.png"/g, `content="${origin}/og-image.png"`));
  };

  const serveStatic = async (req: IncomingMessage, res: ServerResponse, pathname: string) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
    const file = path.normalize(path.join(distDir, pathname));
    const inside = file.startsWith(path.normalize(distDir + path.sep));
    if (inside && pathname !== '/' && pathname !== '/index.html') {
      const info = await stat(file).catch(() => null);
      if (info?.isFile()) {
        res.writeHead(200, {
          'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
          'Content-Length': info.size,
          // Vite's hashed assets never change; everything else is revalidated
          'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        });
        if (req.method === 'HEAD') return res.end();
        createReadStream(file).pipe(res);
        return;
      }
    }
    // Missing files with an extension are real 404s; anything else is an app route (SPA)
    if (path.extname(pathname) && pathname !== '/index.html') throw new HttpError(404, 'Not found');
    return sendIndex(req, res);
  };

  return async (req: IncomingMessage, res: ServerResponse) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (pathname.startsWith('/api/')) await api(req, res, pathname);
      else await serveStatic(req, res, pathname);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error('Request failed:', req.method, pathname, e);
      if (res.headersSent) return res.end();
      if (pathname.startsWith('/api/')) sendJson(res, status, { error: e instanceof HttpError ? e.message : 'Internal error' });
      else { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(String(status)); }
    }
  };
};
