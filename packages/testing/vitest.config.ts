import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

const src = (pkg: string) => fileURLToPath(new URL(`../${pkg}/src/index.ts`, import.meta.url));

export default defineProject({
  resolve: {
    alias: {
      '@awesome-tour/core': src('core'),
      '@awesome-tour/react': src('react'),
      '@awesome-tour/motion': src('motion'),
    },
  },
  test: {
    name: 'testing',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
