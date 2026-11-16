import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/json.ts', 'src/adapters.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: [/^@awesome-tour\//, 'react', 'react-dom', 'motion', 'three', '@react-three/fiber'],
});
