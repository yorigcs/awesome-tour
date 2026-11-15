import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/react-router.ts', 'src/next.ts', 'src/tanstack-router.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  clean: true,
  banner: { js: "'use client';" },
  target: 'es2022',
  external: [/^@awesome-tour\//, 'react', 'react-router', /^next(\/|$)/, '@tanstack/react-router'],
});
