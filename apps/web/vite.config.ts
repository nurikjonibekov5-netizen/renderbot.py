import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// "pages" mode builds into /editor at the repo root for GitHub Pages (relative base).
export default defineConfig(({ mode }) => {
  const pages = mode === 'pages';
  return {
    base: pages ? './' : '/',
    plugins: [react()],
    resolve: {
      alias: { '@scene/schema': fileURLToPath(new URL('../../packages/scene-schema/src/index.ts', import.meta.url)) },
    },
    server: { port: 5180, fs: { allow: ['../..'] } },
    build: {
      outDir: pages ? '../../editor' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
    },
    test: {
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  };
});
