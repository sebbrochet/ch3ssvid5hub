import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/ch3ssvid5hub/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: true,
    cors: true,
  },
}));
