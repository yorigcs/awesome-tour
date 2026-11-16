// End-to-end check of the registry as a consumer sees it:
//   1. build the workspace packages and pack them as tarballs (they may not be on npm yet),
//   2. build the registry pointing at a local static server,
//   3. scaffold a fresh Vite + Tailwind v4 + shadcn app in a temp dir,
//   4. `shadcn add` every item over HTTP, then type-check and build the app.
// Needs network access (npm + ui.shadcn.com for the base components). Usage:
//   pnpm --filter @awesome-tour/registry smoke [--keep]
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const keep = process.argv.includes('--keep');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
// While the registry server below is up, commands must not block this process's event loop
// (the server lives here): run them asynchronously.
const runAsync = (cmd, args, cwd) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`)),
    );
  });

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
/** Packed packages, served below as a tiny npm registry for the `@awesome-tour` scope. */
const packed = new Map();
for (const pkg of ['core', 'react', 'motion']) {
  const out = execFileSync('pnpm', ['pack', '--pack-destination', tarballs], {
    cwd: join(repo, 'packages', pkg),
    encoding: 'utf8',
  });
  const file = resolve(tarballs, out.trim().split('\n').pop().trim().split('/').pop());
  const manifest = JSON.parse(
    execFileSync('tar', ['-xOzf', file, 'package/package.json'], { encoding: 'utf8' }),
  );
  const data = readFileSync(file);
  packed.set(manifest.name, { manifest, data, file });
}

// 2. Serve the registry locally.
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  // npm registry: GET /npm/@awesome-tour/<name> (packument) and /npm/-/<name>.tgz (tarball).
  if (path.startsWith('/npm/')) {
    const rest = path.slice('/npm/'.length);
    if (rest.startsWith('-/')) {
      const name = rest.slice(2, -'.tgz'.length).replace('+', '/');
      const entry = packed.get(name);
      if (!entry) return void res.writeHead(404).end();
      return void res
        .writeHead(200, { 'content-type': 'application/octet-stream' })
        .end(entry.data);
    }
    const entry = packed.get(rest);
    if (!entry) return void res.writeHead(404).end();
    const { manifest, data } = entry;
    const port = server.address().port;
    const version = {
      ...manifest,
      dist: {
        tarball: `http://127.0.0.1:${port}/npm/-/${manifest.name.replace('/', '+')}.tgz`,
        shasum: createHash('sha1').update(data).digest('hex'),
        integrity: `sha512-${createHash('sha512').update(data).digest('base64')}`,
      },
    };
    const time = '2020-01-01T00:00:00.000Z'; // old enough for any minimum-release-age policy
    return void res.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        name: manifest.name,
        'dist-tags': { latest: manifest.version },
        versions: { [manifest.version]: version },
        time: { created: time, modified: time, [manifest.version]: time },
      }),
    );
  }
  const file = join(repo, 'apps/docs/public', path);
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
      types: ['vite/client'],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      // shadcn resolves its aliases through \`baseUrl\` (deprecated in TS 6, still honoured).
      baseUrl: '.',
      ignoreDeprecations: '6.0',
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
  // Resolve the (unpublished) @awesome-tour scope from the local registry, like a real install.
  writeFileSync(join(app, '.npmrc'), `@awesome-tour:registry=${url.replace(/\/r$/, '/npm/')}\n`);
  // Its own workspace root, with the build scripts the app needs allowed (pnpm >= 10).
  writeFileSync(join(app, 'pnpm-workspace.yaml'), 'packages: []\nallowBuilds:\n  esbuild: true\n');
  await runAsync('pnpm', ['install'], app);
  await runAsync('pnpm', ['add', 'clsx', 'tailwind-merge'], app);

  // 4. Install every item through the namespace, like a user would.
  const items = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')).items.map(
    (i) => `@awesome-tour/${i.name}`,
  );
  await runAsync('pnpm', ['dlx', 'shadcn@latest', 'add', ...items, '--yes', '--overwrite'], app);

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
import { AnnouncementBanner, AnnouncementModal, AnnouncementToast } from '@/components/awesome-tour/announcement';
import { SurveyCard } from '@/components/awesome-tour/survey';
import { HelpLauncher } from '@/components/awesome-tour/launcher';
import { createAnnouncement, createSurvey } from '@awesome-tour/react/surfaces';

const tour = createTour({ id: 'smoke', steps: [{ id: 'a', title: 'Hello' }] });
const checklist = createChecklist({ id: 'smoke', items: [{ id: 'a', meta: { title: 'A' } }] });
const banner = createAnnouncement({ id: 'b', title: 'News' });
const toast = createAnnouncement({ id: 't', variant: 'toast', title: 'Saved', autoDismiss: 3000 });
const modal = createAnnouncement({ id: 'm', variant: 'modal', title: 'Big news' });
const survey = createSurvey({ id: 's', questions: [{ id: 'q', type: 'nps', prompt: 'Recommend us?' }] });

createRoot(document.getElementById('root')!).render(
  <Tour.Root tour={tour}>
    <button id="target">Target</button>
    <HotspotHint target="#target" title="Hint">Body</HotspotHint>
    <ChecklistPanel checklist={checklist} />
    <TourPopover dots />
    <TourMotionPopover backdrop="spotlight" />
    <AnnouncementBanner announcement={banner} actionLabel="Open" snooze={1000} />
    <AnnouncementToast announcement={toast} />
    <AnnouncementModal announcement={modal} actionLabel="Got it" />
    <SurveyCard survey={survey} />
    <HelpLauncher tours={[{ tour, title: 'Tour' }]} links={[{ title: 'Docs', href: '/docs' }]} />
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
