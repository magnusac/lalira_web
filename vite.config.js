import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        cms: resolve(__dirname, 'cms/index.html'),
      },
    },
  },
});
