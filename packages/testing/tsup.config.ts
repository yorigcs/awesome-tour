import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.tsx', 'src/playwright.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: [
    /^@awesome-tour\//,
    'react',
    'react-dom',
    '@testing-library/react',
    '@playwright/test',
  ],
});
