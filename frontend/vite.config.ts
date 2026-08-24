import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pré-otimiza pacotes usados sobretudo por rotas lazy (admin). Sem isso o
  // Vite os descobre tarde, reotimiza no meio da sessão e quebra as abas já
  // abertas (sintoma: ícones do MUI desaparecem com o botão clicável).
  optimizeDeps: {
    include: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.match(/[\\/]node_modules[\\/](@mui|@emotion|@babel[\\/]*runtime|react-is)[\\/]/)) {
            return 'vendor';
          }
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/)) {
            return 'react';
          }
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    host: true,
    port: 5173,
    watch: process.env.VITE_DOCKER_DEV ? { usePolling: true } : undefined,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
