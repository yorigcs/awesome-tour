import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/surfaces.ts'],
  format: ['esm', 'cjs'],
  // Shared chunks for both formats: the surfaces entry must reuse the main entry's React contexts.
  splitting: true,
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  clean: true,
  banner: { js: "'use client';" },
  target: 'es2022',
  external: [/^@awesome-tour\//, 'react', 'react-dom', 'motion', 'three', '@react-three/fiber'],
});
