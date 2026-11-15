// Lints every publishable package as consumers will get it: publint (package.json / exports /
// files) and, for packages with type exports, Are The Types Wrong (node16 ESM + CJS, bundler).
// Run after `pnpm build`.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
for (const dir of readdirSync('packages')) {
  const cwd = join('packages', dir);
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  if (pkg.private) continue;
  const checks = [['publint', '--strict']];
  if (pkg.exports) checks.push(['attw', '--pack', '.', '--profile', 'node16', '--format', 'ascii']);
  for (const [bin, ...args] of checks) {
    try {
      execFileSync('pnpm', ['exec', bin, ...args], { cwd, stdio: 'pipe', encoding: 'utf8' });
      console.log(`✔ ${pkg.name} — ${bin}`);
    } catch (error) {
      failures.push(pkg.name);
      console.error(`✖ ${pkg.name} — ${bin}\n${error.stdout ?? ''}${error.stderr ?? ''}`);
    }
  }
}
if (failures.length) {
  console.error(`\nPackage checks failed: ${[...new Set(failures)].join(', ')}`);
  process.exit(1);
}
