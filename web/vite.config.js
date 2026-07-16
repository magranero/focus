import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const server = 'http://localhost:8642';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      '/api': server,
      '/widgets': server,
      '/bridge.js': server
    }
  }
});
