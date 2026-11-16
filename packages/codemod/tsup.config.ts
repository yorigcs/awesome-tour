import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    banner: { js: '#!/usr/bin/env node' },
    clean: true,
    target: 'node20',
    external: ['jscodeshift'],
  },
  {
    // jscodeshift workers `require()` transforms: ship them as CommonJS.
    entry: {
      'transforms/joyride': 'src/transforms/joyride.ts',
      'transforms/shepherd': 'src/transforms/shepherd.ts',
      'transforms/driver': 'src/transforms/driver.ts',
    },
    format: ['cjs'],
    target: 'node20',
    external: ['jscodeshift'],
  },
]);
