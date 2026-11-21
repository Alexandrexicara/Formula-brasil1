import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsDir: 'assets'
  },
  server: { host: '0.0.0.0' }
});
