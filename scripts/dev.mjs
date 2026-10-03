#!/usr/bin/env node
// Local dev: Vite (HMR, :3000) + the API server (server/index.ts, :8788, restarts on change).
// Vite proxies /api/* to it (see vite.config.ts); data in ./data. Ctrl-C stops both.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiPort = process.env.API_PORT || '8788';
const env = { ...process.env, API_PORT: apiPort, PORT: apiPort, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' };

const procs = [
  { name: 'api', color: 35, args: ['--watch', 'server/index.ts'] },
  { name: 'web', color: 36, args: ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)] },
];

const isWin = process.platform === 'win32';
let shuttingDown = false;
let exitCode = 0;

for (const p of procs) {
  const prefix = `\x1b[${p.color}m[${p.name}]\x1b[0m `;
  p.child = spawn(process.execPath, p.args, {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !isWin, // own process group, so we can kill grandchildren (esbuild)
  });
  for (const [stream, out] of [[p.child.stdout, process.stdout], [p.child.stderr, process.stderr]]) {
    createInterface({ input: stream }).on('line', (line) => out.write(prefix + line + '\n'));
  }
  p.child.on('exit', (code, signal) => {
    p.exited = true;
    if (!shuttingDown) {
      console.error(`${prefix}exited (${signal ?? code}), stopping all`);
      exitCode = code || 1;
      shutdown();
    }
    if (procs.every((q) => q.exited)) process.exit(exitCode);
  });
}

function kill(p, signal) {
  try {
    // Signal the whole group even if the leader is gone: its children may still be alive.
    if (!isWin) process.kill(-p.child.pid, signal);
    else if (!p.exited) p.child.kill(signal);
  } catch {
    /* already gone */
  }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const p of procs) kill(p, 'SIGTERM');
  setTimeout(() => {
    for (const p of procs) kill(p, 'SIGKILL');
    process.exit(exitCode);
  }, 5000).unref();
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, shutdown);
process.on('exit', () => procs.forEach((p) => kill(p, 'SIGKILL')));
