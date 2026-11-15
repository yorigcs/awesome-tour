// @ts-check
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';

/** @param {string} pkg */
const src = (pkg) => fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  site: 'https://yorigcs.github.io',
  base: '/awesome-tour',
  trailingSlash: 'always',
  integrations: [expressiveCode(), mdx(), react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      // Document the sources directly, like the playground does.
      alias: {
        '@awesome-tour/core': src('core'),
        '@awesome-tour/react': src('react'),
        '@awesome-tour/motion': src('motion'),
        '@awesome-tour/devtools': src('devtools'),
        // The shadcn registry sources: demos use exactly what `npx shadcn add` installs.
        '@': fileURLToPath(new URL('../../registry/src', import.meta.url)),
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});
