import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'codemod',
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
