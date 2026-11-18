import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (pkg: string) =>
  fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Use package sources directly for instant HMR while developing the library.
    alias: {
      // The shadcn registry: the playground uses exactly what `npx shadcn add` installs.
      '@': fileURLToPath(new URL('../../registry/src', import.meta.url)),
      // Loopwork, the example app (shared with the docs demos).
      '@loopwork': fileURLToPath(new URL('../../examples/loopwork/src/index.ts', import.meta.url)),
      '@awesome-tour/core/json': fileURLToPath(
        new URL('../../packages/core/src/json.ts', import.meta.url),
      ),
      '@awesome-tour/core/adapters': fileURLToPath(
        new URL('../../packages/core/src/adapters.ts', import.meta.url),
      ),
      '@awesome-tour/core': src('core'),
      '@awesome-tour/react/surfaces': fileURLToPath(
        new URL('../../packages/react/src/surfaces.ts', import.meta.url),
      ),
      '@awesome-tour/react': src('react'),
      '@awesome-tour/motion': src('motion'),
      '@awesome-tour/three': src('three'),
      '@awesome-tour/devtools': src('devtools'),
    },
  },
  server: { port: 5173 },
});
