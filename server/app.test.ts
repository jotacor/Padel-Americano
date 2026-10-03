import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './app.ts';
import { createStore, TTL_MS } from './store.ts';

let server: Server;
let base = '';
let dataDir = '';
let clock = Date.parse('2026-10-04T10:00:00Z');
const tournament = { id: 't', name: 'Liga', players: [], rounds: [], isStarted: true };

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'padel-data-'));
  const distDir = await mkdtemp(path.join(tmpdir(), 'padel-dist-'));
  await mkdir(path.join(distDir, 'assets'));
  await writeFile(path.join(distDir, 'index.html'), '<meta property="og:image" content="/og-image.png" /><div id="root"></div>');
  await writeFile(path.join(distDir, 'assets', 'index-abc.js'), 'console.log(1)');
  server = createServer(createApp({ store: createStore(dataDir, () => clock), distDir, now: () => clock }));
  await new Promise<void>(resolve => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  server.close();
  await rm(dataDir, { recursive: true, force: true });
});

const json = (method: string, url: string, body?: unknown, pin?: string) => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(pin && { 'X-Tournament-Pin': pin }) },
  body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
});

describe('shared tournaments API (files in DATA_DIR)', () => {
  it('create → read → update → delete, with the write token', async () => {
    const created = await json('POST', '/api/game', { tournament });
    expect(created.status).toBe(201);
    const { id, pin } = await created.json() as { id: string; pin: string };
    expect(id).toMatch(/^[a-z]+-[a-z]+$/);
    expect(pin).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await readdir(path.join(dataDir, 'shares'))).toContain(`${id}.json`);

    const read = await (await json('GET', `/api/game/${id}`)).json() as { tournament: unknown; pinHash?: string };
    expect(read.tournament).toEqual(tournament);
    expect(read.pinHash).toBeUndefined();

    expect((await json('PUT', `/api/game/${id}`, { tournament })).status).toBe(401);
    expect((await json('PUT', `/api/game/${id}`, { tournament }, 'wrong')).status).toBe(403);
    expect((await json('PUT', `/api/game/${id}`, '{bad', pin)).status).toBe(400);
    expect((await json('PUT', `/api/game/${id}`, { tournament: {} }, pin)).status).toBe(400);
    expect((await json('PUT', `/api/game/${id}`, { tournament: { ...tournament, x: 'a'.repeat(600_000) } }, pin)).status).toBe(413);
    const updated = await json('PUT', `/api/game/${id}`, { tournament: { ...tournament, name: 'Liga 2' } }, pin);
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as { tournament: { name: string } }).tournament.name).toBe('Liga 2');

    expect((await json('DELETE', `/api/game/${id}`, undefined, 'wrong')).status).toBe(403);
    expect((await json('DELETE', `/api/game/${id}`, undefined, pin)).status).toBe(200);
    expect((await json('GET', `/api/game/${id}`)).status).toBe(404);
  });

  it('expires 24 h after the last update, and the sweep deletes the file', async () => {
    const { id, pin } = await (await json('POST', '/api/game', { tournament })).json() as { id: string; pin: string };
    clock += TTL_MS - 1000;
    expect((await json('PUT', `/api/game/${id}`, { tournament }, pin)).status).toBe(200); // renews
    clock += TTL_MS - 1000;
    expect((await json('GET', `/api/game/${id}`)).status).toBe(200);
    clock += 2000;
    expect((await json('GET', `/api/game/${id}`)).status).toBe(404);
    const store = createStore(dataDir, () => clock);
    await json('POST', '/api/game', { tournament });
    clock += TTL_MS + 1;
    expect(await store.sweep()).toBeGreaterThanOrEqual(1);
    expect(await readdir(path.join(dataDir, 'shares'))).toEqual([]);
  });

  it('rejects odd ids without touching the disk', async () => {
    expect((await json('GET', '/api/game/..%2F..%2Fetc%2Fpasswd')).status).toBe(404);
    expect((await json('GET', '/api/game/a.b')).status).toBe(404);
    expect((await json('GET', '/api/health')).status).toBe(200);
  });
});

describe('frontend', () => {
  it('serves index.html for app routes with absolute og:image, assets with long cache, 404 for missing files', async () => {
    const page = await fetch(`${base}/game/bala-zapato`, { headers: { 'X-Forwarded-Proto': 'https' } });
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(await page.text()).toContain(`content="https://127.0.0.1:${new URL(base).port}/og-image.png"`);
    const asset = await fetch(`${base}/assets/index-abc.js`);
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect(asset.headers.get('content-type')).toContain('text/javascript');
    expect((await fetch(`${base}/missing.js`)).status).toBe(404);
  });
});
