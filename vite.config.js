import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// "demo" rejimi: server kerak bo'lmagan, telefonda ochiladigan namunaviy versiya.
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    root: 'web',
    base: demo ? './' : '/',
    plugins: [react()],
    define: { __DEMO__: JSON.stringify(demo) },
    build: {
      outDir: demo ? '../dist-demo' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2500,
      // Eski brauzerlarda ham ochilishi uchun (Chrome/Edge 87+, Firefox 78+, Safari 14+).
      target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8080',
        '/models': 'http://localhost:8080',
        '/ws': { target: 'ws://localhost:8080', ws: true },
      },
    },
  };
});
