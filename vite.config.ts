import { execSync } from 'node:child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Commit shown discreetly in the app (setup panel footer): GIT_COMMIT (Docker/CI build arg) or the local git HEAD */
const commit = (() => {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.slice(0, 6);
  try { return execSync('git rev-parse --short=6 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'dev'; }
})();

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: { __APP_COMMIT__: JSON.stringify(commit) },
      server: {
        port: 3000,
        host: '0.0.0.0',
        // `npm run dev` also runs the API server (scripts/dev.mjs); proxy /api to it
        proxy: {
          '/api': `http://127.0.0.1:${env.API_PORT || 8788}`,
        },
      },
      plugins: [react()],
    };
});
