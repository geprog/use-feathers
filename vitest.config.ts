import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
      '$/': `${path.resolve(__dirname, 'test')}/`,
    },
  },
  test: {
    environment: 'jsdom',
    onConsoleLog: (log, type) => {
      if (type === 'stderr') {
        throw new Error(`Unexpected call to console.warn or console.error: ${log}`);
      }
    },
    coverage: {
      '100': true,
    },
  },
});
