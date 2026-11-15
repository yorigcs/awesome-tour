// Builds the shadcn registry into the docs site (served at <site>/awesome-tour/r/<item>.json).
// Items reference each other through `{{REGISTRY_URL}}`; override it to test against a local server:
//   REGISTRY_URL=http://localhost:4322/awesome-tour/r pnpm --filter @awesome-tour/registry build
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = (process.env.REGISTRY_URL ?? 'https://yorigcs.github.io/awesome-tour/r').replace(
  /\/$/,
  '',
);
const output = resolve(root, '../apps/docs/public/r');

// Pin our packages to the versions in this checkout, so `shadcn add` installs a release the
// components were written against (the registry is deployed together with each release).
const versions = Object.fromEntries(
  readdirSync(join(root, '../packages')).map((pkgDir) => {
    const pkg = JSON.parse(readFileSync(join(root, '../packages', pkgDir, 'package.json'), 'utf8'));
    return [pkg.name, pkg.version];
  }),
);
const registry = JSON.parse(
  readFileSync(join(root, 'registry.json'), 'utf8').replaceAll('{{REGISTRY_URL}}', url),
);
for (const item of registry.items) {
  item.dependencies = item.dependencies?.map((dep) =>
    versions[dep] ? `${dep}@^${versions[dep]}` : dep,
  );
}
const source = JSON.stringify(registry, null, 2);
const dir = mkdtempSync(join(tmpdir(), 'awesome-tour-registry-'));
const file = join(dir, 'registry.json');
writeFileSync(file, source);
try {
  rmSync(output, { recursive: true, force: true });
  execFileSync('pnpm', ['exec', 'shadcn', 'build', file, '--output', output, '--cwd', root], {
    cwd: root,
    stdio: 'inherit',
  });
  console.log(`\nRegistry built into ${output} (REGISTRY_URL=${url})`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
