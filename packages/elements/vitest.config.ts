import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    alias: {
      '@awesome-tour/core/json': fileURLToPath(new URL('../core/src/json.ts', import.meta.url)),
      '@awesome-tour/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'elements',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
