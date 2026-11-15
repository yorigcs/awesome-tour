// @ts-check
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

/** @param {string} pkg */
const src = (pkg) => fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  site: 'https://yorigcs.github.io',
  base: '/awesome-tour',
  integrations: [
    starlight({
      title: 'awesome-tour',
      description:
        'Unstyled, accessible, composable primitives for product tours and onboarding in React.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/yorigcs/awesome-tour' },
      ],
      editLink: { baseUrl: 'https://github.com/yorigcs/awesome-tour/edit/main/apps/docs/' },
      customCss: ['./src/styles/custom.css', './src/styles/demo.css'],
      sidebar: [
        { label: 'Getting started', items: ['introduction', 'installation', 'quick-start'] },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
        { label: 'Components', items: [{ autogenerate: { directory: 'components' } }] },
        { label: 'API reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
    }),
    react(),
  ],
  vite: {
    resolve: {
      // Document the sources directly, like the playground does.
      alias: {
        '@awesome-tour/core': src('core'),
        '@awesome-tour/react': src('react'),
        '@awesome-tour/motion': src('motion'),
        '@awesome-tour/devtools': src('devtools'),
      },
    },
  },
});
