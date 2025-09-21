import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@components': resolve(__dirname, './components'),
      '@lib': resolve(__dirname, './lib'),
      '@assets': resolve(__dirname, './assets'),
      '@entry': resolve(__dirname, './entrypoints'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
  define: {
    __BROWSER__: true,
    __CHROME__: true,
    __FIREFOX__: false,
    __SAFARI__: false,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
