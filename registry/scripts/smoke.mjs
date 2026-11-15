// End-to-end check of the registry as a consumer sees it:
//   1. build the workspace packages and pack them as tarballs (they may not be on npm yet),
//   2. build the registry pointing at a local static server,
//   3. scaffold a fresh Vite + Tailwind v4 + shadcn app in a temp dir,
//   4. `shadcn add` every item over HTTP, then type-check and build the app.
// Needs network access (npm + ui.shadcn.com for the base components). Usage:
//   pnpm --filter @awesome-tour/registry smoke [--keep]
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const keep = process.argv.includes('--keep');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

const work = mkdtempSync(join(tmpdir(), 'awesome-tour-smoke-'));
const app = join(work, 'app');
const tarballs = join(work, 'tarballs');
mkdirSync(join(app, 'src'), { recursive: true });
mkdirSync(tarballs);

// 1. Pack the packages the registry items depend on.
run(
  'pnpm',
  [
    '--filter',
    '@awesome-tour/core',
    '--filter',
    '@awesome-tour/react',
    '--filter',
    '@awesome-tour/motion',
    'build',
  ],
  repo,
);
const overrides = {};
for (const pkg of ['core', 'react', 'motion']) {
  const out = execFileSync('pnpm', ['pack', '--pack-destination', tarballs], {
    cwd: join(repo, 'packages', pkg),
    encoding: 'utf8',
  });
  const tgz = out.trim().split('\n').pop().trim();
  overrides[`@awesome-tour/${pkg}`] = `file:${resolve(tarballs, tgz.split('/').pop())}`;
}

// 2. Serve the registry locally.
const server = createServer((req, res) => {
  const file = join(repo, 'apps/docs/public', decodeURIComponent(req.url.split('?')[0]));
  try {
    res.writeHead(200, { 'content-type': 'application/json' }).end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/r`;
execFileSync('node', [join(root, 'scripts/build.mjs')], {
  stdio: 'inherit',
  env: { ...process.env, REGISTRY_URL: url },
});

try {
  // 3. A minimal Vite + React + Tailwind v4 app configured for shadcn.
  const json = (file, data) => writeFileSync(join(app, file), `${JSON.stringify(data, null, 2)}\n`);
  json('package.json', {
    name: 'smoke-app',
    private: true,
    type: 'module',
    dependencies: { react: '^19.2.0', 'react-dom': '^19.2.0' },
    devDependencies: {
      '@tailwindcss/vite': '^4.1.0',
      '@types/react': '^19.2.0',
      '@types/react-dom': '^19.2.0',
      '@vitejs/plugin-react': '^5.0.0',
      tailwindcss: '^4.1.0',
      typescript: '6.0.3',
      vite: '^7.0.0',
    },
  });
  json('tsconfig.json', {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
    },
    include: ['src'],
  });
  json('components.json', {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: 'src/index.css', baseColor: 'neutral', cssVariables: true },
    iconLibrary: 'lucide',
    aliases: {
      components: '@/components',
      utils: '@/lib/utils',
      ui: '@/components/ui',
      lib: '@/lib',
      hooks: '@/hooks',
    },
    registries: { '@awesome-tour': `${url}/{name}.json` },
  });
  writeFileSync(
    join(app, 'vite.config.ts'),
    `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
`,
  );
  writeFileSync(
    join(app, 'index.html'),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n',
  );
  writeFileSync(join(app, 'src/index.css'), '@import "tailwindcss";\n');
  mkdirSync(join(app, 'src/lib'));
  writeFileSync(
    join(app, 'src/lib/utils.ts'),
    "import { type ClassValue, clsx } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n",
  );
  // Its own workspace root: tarball overrides + allowed build scripts (pnpm >= 10).
  writeFileSync(
    join(app, 'pnpm-workspace.yaml'),
    `packages: []\nallowBuilds:\n  esbuild: true\noverrides:\n${Object.entries(overrides)
      .map(([name, spec]) => `  "${name}": "${spec}"`)
      .join('\n')}\n`,
  );
  run('pnpm', ['install'], app);
  run('pnpm', ['add', 'clsx', 'tailwind-merge'], app);

  // 4. Install every item through the namespace, like a user would.
  const items = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')).items.map(
    (i) => `@awesome-tour/${i.name}`,
  );
  run('pnpm', ['dlx', 'shadcn@latest', 'add', ...items, '--yes', '--overwrite'], app);

  // Use every exported component so type errors in any item surface.
  writeFileSync(
    join(app, 'src/main.tsx'),
    `import './index.css';
import { createChecklist, createTour, Tour } from '@awesome-tour/react';
import { createRoot } from 'react-dom/client';
import { ChecklistPanel } from '@/components/awesome-tour/checklist';
import { HotspotHint } from '@/components/awesome-tour/hotspot';
import { TourPopover } from '@/components/awesome-tour/tour';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';

const tour = createTour({ id: 'smoke', steps: [{ id: 'a', title: 'Hello' }] });
const checklist = createChecklist({ id: 'smoke', items: [{ id: 'a', meta: { title: 'A' } }] });

createRoot(document.getElementById('root')!).render(
  <Tour.Root tour={tour}>
    <button id="target">Target</button>
    <HotspotHint target="#target" title="Hint">Body</HotspotHint>
    <ChecklistPanel checklist={checklist} />
    <TourPopover dots />
    <TourMotionPopover backdrop="spotlight" />
  </Tour.Root>,
);
`,
  );
  run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], app);
  run('pnpm', ['exec', 'vite', 'build'], app);
  console.log('\n✔ Registry smoke test passed');
} finally {
  server.close();
  if (keep) console.log(`Kept ${work}`);
  else rmSync(work, { recursive: true, force: true });
  // Restore the production registry URLs.
  execFileSync('node', [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
}
