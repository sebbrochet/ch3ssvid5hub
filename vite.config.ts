import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version } from './package.json';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function swCachePlugin() {
  return {
    name: 'sw-cache-version',
    closeBundle() {
      const swPath = resolve('dist/sw.js');
      const content = readFileSync(swPath, 'utf-8');
      const hash = createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8);
      writeFileSync(swPath, content.replace('__BUILD_HASH__', hash));
    },
  };
}

export default defineConfig(() => ({
  plugins: [react(), swCachePlugin()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: true,
    cors: true,
  },
}));
