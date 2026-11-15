import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  clean: true,
  banner: { js: "'use client';" },
  target: 'es2022',
  external: [/^@awesome-tour\//, 'react', 'react-dom', 'motion', 'three', '@react-three/fiber'],
});
