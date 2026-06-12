import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // API requests go to the Express server during development.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
