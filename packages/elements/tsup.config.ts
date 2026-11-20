import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/define.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: [/^@awesome-tour\//],
});
