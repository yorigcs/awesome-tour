import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TRANSFORMS = {
  joyride: 'react-joyride',
  shepherd: 'Shepherd (shepherd.js / react-shepherd)',
  driver: 'driver.js',
} as const;

const usage = `Usage: awesome-tour-codemod <transform> <paths...> [--dry] [--print]

Transforms:
${Object.entries(TRANSFORMS)
  .map(([name, lib]) => `  ${name.padEnd(10)} from ${lib}`)
  .join('\n')}

Rewrites step definitions in place and leaves "// TODO(awesome-tour): …" comments where a
manual change is needed. Commit or stash first; use --dry --print to preview.`;

async function main() {
  const args = process.argv.slice(2);
  const [name, ...rest] = args.filter((a) => !a.startsWith('--'));
  if (!name || !(name in TRANSFORMS) || rest.length === 0 || args.includes('--help')) {
    console.log(usage);
    process.exit(name && !(name in TRANSFORMS) ? 1 : 0);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const transform = join(here, 'transforms', `${name}.cjs`);
  if (!existsSync(transform)) throw new Error(`Transform not found: ${transform}`);
  const require = createRequire(import.meta.url);
  const { run } = require('jscodeshift/src/Runner.js') as {
    run: (t: string, paths: string[], opts: Record<string, unknown>) => Promise<unknown>;
  };
  await run(transform, rest, {
    parser: 'tsx',
    extensions: 'js,jsx,ts,tsx,mjs,cjs',
    ignorePattern: ['**/node_modules/**', '**/dist/**'],
    dry: args.includes('--dry'),
    print: args.includes('--print'),
    verbose: 1,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
