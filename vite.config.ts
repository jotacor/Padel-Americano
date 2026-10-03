import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // `npm run dev` runs Pages Functions via wrangler (scripts/dev.mjs); proxy the API to it
        proxy: {
          '/api': `http://127.0.0.1:${env.API_PORT || 8788}`,
        },
      },
      plugins: [react()],
    };
});
