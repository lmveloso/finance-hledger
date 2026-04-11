import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite proxy para que /api/* em dev vá pro FastAPI em :8080
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
