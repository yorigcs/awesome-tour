import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (pkg: string) =>
  fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use package sources directly for instant HMR while developing the library.
    alias: {
      '@awesome-tour/core': src('core'),
      '@awesome-tour/react': src('react'),
      '@awesome-tour/motion': src('motion'),
      '@awesome-tour/three': src('three'),
    },
  },
  server: { port: 5173 },
});
