// Padel Americano server: `node server/index.ts` (Node ≥ 22.18 runs TypeScript directly).
// Env: PORT (8788), DATA_DIR (./data; Docker: /data), DIST_DIR (./dist).
import { createServer } from 'node:http';
import path from 'node:path';
import { createApp } from './app.ts';
import { createStore } from './store.ts';

const port = Number(process.env.PORT) || 8788;
const dataDir = path.resolve(process.env.DATA_DIR || 'data');
const distDir = path.resolve(process.env.DIST_DIR || 'dist');

const store = createStore(dataDir);
const server = createServer(createApp({ store, distDir }));

// Drop expired shares every hour (reads also ignore them)
const sweep = () => store.sweep().catch(e => console.error('Sweep failed:', e));
sweep();
setInterval(sweep, 60 * 60 * 1000).unref();

server.listen(port, () => console.log(`Padel Americano on http://localhost:${port} (data: ${dataDir})`));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
