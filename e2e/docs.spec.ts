import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const DOCS = 'http://localhost:4322/awesome-tour';

/** Demos are `client:visible` islands: wait until the first one has hydrated before clicking. */
async function hydrated(page: import('@playwright/test').Page) {
  const island = page.locator('astro-island:has([data-demo-frame])').first();
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute('ssr', '');
}

test('landing page tour runs on the docs site itself', async ({ page }) => {
  await page.goto(`${DOCS}/`);
  await page.getByRole('button', { name: 'Take the tour' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('This page is the demo');
  await page.keyboard.press('ArrowRight');
  await expect(dialog).toContainText('One package');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('interactive steps demo advances on what the user does in the app @cross', async ({
  page,
}) => {
  await page.goto(`${DOCS}/guides/interactive-steps/`);
  await hydrated(page);
  await page.getByRole('button', { name: 'Start tour' }).click();
  const dialog = page.getByRole('dialog');
  const app = page.locator('#first-beat');
  await expect(dialog).toContainText('Lay down four kicks');
  for (const step of [1, 5, 9, 13]) {
    await app.getByRole('button', { name: `Kick, step ${step}`, exact: true }).click();
  }
  await expect(dialog).toContainText('Bring the bass up to 60%');
  // Arrow keys on the knob (a slider) move the knob, not the tour.
  const knob = app.getByRole('slider', { name: 'Bass level' });
  await knob.focus();
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(dialog).toContainText('Now play it');
  await app.getByRole('button', { name: 'Play' }).click();
  await expect(dialog).toContainText('That’s your first beat');
});

test('persistence demo resumes after a simulated reload', async ({ page }) => {
  await page.goto(`${DOCS}/guides/persistence/`);
  await page.getByRole('button', { name: 'Clear storage' }).click();
  await page.getByRole('button', { name: 'Start tour' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Lay down the kick');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog).toContainText('Snare on 2 and 4');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Simulate reload' }).click();
  await page.getByRole('button', { name: 'Start tour' }).click();
  await expect(page.getByRole('dialog')).toContainText('Snare on 2 and 4');
});

const DEMO_PAGES = [
  'quick-start',
  'guides/targets',
  'guides/interactive-steps',
  'guides/branching',
  'guides/persistence',
  'guides/analytics',
  'guides/checklist',
  'guides/hotspots',
  'guides/styling',
  'guides/animation',
  'guides/devtools',
  'guides/i18n',
  'guides/display-rules',
  'guides/announcements',
  'guides/surveys',
  'guides/launcher',
  'guides/json-tours',
  'registry/tour',
  'registry/checklist',
  'registry/hotspot',
  'registry/help-center',
  'guides/stress-lab',
  'guides/multi-page',
  'guides/multiple-tours',
  'guides/accessibility',
  'guides/three',
  'guides/experiments',
  'guides/without-react',
];

/** Returning visitor: the landing tour has already introduced itself. */
const seenLanding = (page: import('@playwright/test').Page) =>
  page.addInitScript(() => localStorage.setItem('awesome-tour-landing-seen', '1'));

test('landing tour starts by itself once the diagram assembles, only on the first visit', async ({
  page,
}) => {
  await page.goto(`${DOCS}/`);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('This page is the demo', { timeout: 6000 });
  // Non-modal: the page stays usable.
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForTimeout(3500);
  await expect(dialog).toHaveCount(0);
});

test('i18n demo translates the primitives', async ({ page }) => {
  await page.goto(`${DOCS}/guides/i18n/`);
  await page.getByRole('button', { name: 'Iniciar tour' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Transporte');
  await expect(dialog.getByRole('button', { name: 'Fechar tour' })).toBeVisible();
  await expect(page.locator('[data-tour-announcer]', { hasText: 'Passo 1 de 3' })).toHaveCount(1);
});

test('display rules demo: audience blocks, the signal starts it, the clock expires the snooze', async ({
  page,
}) => {
  await page.goto(`${DOCS}/guides/display-rules/`);
  await hydrated(page);
  const frame = page.locator('[data-demo-frame]');
  const checks = frame.getByRole('list', { name: 'Rule checks' });
  await frame.getByRole('button', { name: 'Mix', exact: true }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(checks).toContainText('audience() returned false');
  await frame.getByRole('button', { name: 'Arrange', exact: true }).click();
  await frame.getByRole('button', { name: 'pro', exact: true }).click();
  await frame.getByRole('button', { name: 'Mix', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Stems are unlocked');
  await page.getByRole('button', { name: 'Remind me in 2 days' }).click();
  await expect(checks).toContainText('snoozed until');
  await frame.getByRole('button', { name: '+1 week' }).click();
  await expect(checks).toContainText('snooze over');
});

test('tours as data: edits to the JSON are validated and built', async ({ page }) => {
  await page.goto(`${DOCS}/guides/json-tours/`);
  const frame = page.locator('[data-demo-frame]');
  const editor = frame.getByRole('textbox', { name: 'Tour JSON' });
  await editor.fill((await editor.inputValue()).replace('"Loaded from JSON"', '"Edited title"'));
  await frame.getByRole('button', { name: 'Build & start' }).click();
  await expect(page.getByRole('dialog')).toContainText('Edited title');
  await page.keyboard.press('Escape');
  await editor.fill('{ "id": "x", "steps": [{ "id": "a", "when": "nope" }] }');
  await frame.getByRole('button', { name: 'Build & start' }).click();
  await expect(frame.getByRole('alert')).toContainText('unknown action "nope"');
});

test('landing workbench swaps parts while the tour runs', async ({ page }) => {
  await seenLanding(page);
  await page.goto(`${DOCS}/`);
  const bench = page.locator('[data-tour="workbench"]');
  await bench.scrollIntoViewIfNeeded();
  const dialog = page.getByRole('dialog');
  // The bench runs a live step by itself while it is on screen.
  await expect(dialog).toContainText('Change a part');
  await expect(dialog).toContainText('Change a part');
  await bench.getByText('CSS', { exact: true }).click();
  await bench.getByText('Skip', { exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Skip tour' })).toBeVisible();
  await expect(bench.locator('pre')).toContainText('<TourCardContents skip />');
});

test('docs pages have working navigation and search trigger', async ({ page }) => {
  await page.goto(`${DOCS}/guides/targets/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Targets');
  await page.getByRole('link', { name: /Next/ }).click();
  await expect(page).toHaveURL(/interactive-steps\/$/);
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox', { name: 'Search' }).fill('anchor');
  await expect(page.locator('[data-search-results] a').first()).toBeVisible();
});

test('the header shows the released version and links to the changelog', async ({ page }) => {
  const { version } = JSON.parse(readFileSync('packages/react/package.json', 'utf8'));
  await page.goto(`${DOCS}/guides/targets/`);
  await page.getByRole('link', { name: `v${version} changelog` }).click();
  await expect(page).toHaveURL(/changelog\/$/);
  await expect(page.getByRole('heading', { level: 2, name: version })).toBeVisible();
});

test('the whole site is axe-clean outside demos too', async ({ page }) => {
  await seenLanding(page);
  for (const path of ['', 'guides/targets/', 'registry/', 'changelog/']) {
    await page.goto(`${DOCS}/${path}`);
    const results = await new AxeBuilder({ page }).exclude('[data-demo-frame]').analyze();
    expect(results.violations, path).toEqual([]);
  }
});

for (const path of DEMO_PAGES) {
  test(`demos on /${path} have no axe violations`, async ({ page }) => {
    await page.goto(`${DOCS}/${path}/`);
    await page.locator('[data-demo-frame]').first().waitFor();
    const results = await new AxeBuilder({ page }).include('[data-demo-frame]').analyze();
    expect(results.violations).toEqual([]);
  });
}

test.describe('dark theme', () => {
  test.use({ colorScheme: 'dark' });
  for (const path of [
    'quick-start',
    'guides/styling',
    'registry/tour',
    'registry/checklist',
    'guides/stress-lab',
    'registry/help-center',
  ]) {
    test(`demos on /${path} have no axe violations (dark)`, async ({ page }) => {
      await page.goto(`${DOCS}/${path}/`);
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);
      await page.locator('[data-demo-frame]').first().waitFor();
      const results = await new AxeBuilder({ page }).include('[data-demo-frame]').analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('tour card is readable in dark mode', async ({ page }) => {
    await page.goto(`${DOCS}/quick-start/`);
    await page.getByRole('button', { name: 'Start tour' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role=dialog]').analyze();
    expect(results.violations).toEqual([]);
  });
});

test('stress lab: every case puts the card on screen, next to its target, never covering it @cross', async ({
  page,
}) => {
  await page.goto(`${DOCS}/guides/stress-lab/`);
  await hydrated(page);
  const frame = page.locator('[data-demo-frame]');
  const cases = [
    'scroll',
    'dialog',
    'transform',
    'iframe',
    'shadow',
    'rtl',
    'slow',
    'virtual',
    'lost',
  ];
  for (const id of cases) {
    await frame.locator(`[data-scenario="${id}"]`).click();
    const card = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading') })
      .last();
    await expect(card).toBeVisible({ timeout: 5000 });
    // Geometry settles after scrolling (smooth in some engines): assert once it has.
    await expect(async () => {
      const box = (await card.boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(box.x, id).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, id).toBeLessThanOrEqual(viewport.width + 1);
      // Its target is highlighted, and the card sits beside it, not on it.
      if (id === 'iframe') return;
      const target = page.locator('[data-tour-target]').first();
      const t = (await target.boundingBox())!;
      const overlaps = !(
        box.x >= t.x + t.width ||
        t.x >= box.x + box.width ||
        box.y >= t.y + t.height ||
        t.y >= box.y + box.height
      );
      expect(overlaps, `${id}: card covers its target`).toBe(false);
    }).toPass({ timeout: 4000 });
    // The card's own buttons are reachable by the pointer (not under an overlay or inert).
    const button = card.getByRole('button', { name: /Next|Finish/ }).first();
    if (await button.count()) {
      const b = (await button.boundingBox())!;
      const hit = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x!, y!)?.closest('[role=dialog]')?.textContent ?? '',
        [b.x + b.width / 2, b.y + b.height / 2],
      );
      expect(hit, `${id}: buttons are clickable`).toContain(
        await card.getByRole('heading').textContent(),
      );
    }
    await page.keyboard.press('Escape');
  }
});

test('multi-page demo walks across pages and into a virtualized list', async ({ page }) => {
  await page.goto(`${DOCS}/guides/multi-page/`);
  await hydrated(page);
  await page.getByRole('button', { name: 'Start tour' }).click();
  const dialog = page.getByRole('dialog');
  const app = page.locator('#session');
  await expect(dialog).toContainText('Sketch on Arrange');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog).toContainText('A Rhodes loop');
  await expect(app.locator('[aria-current=page]')).toHaveText('Library');
  await expect(app.locator('[data-tour="sample-keys-rhodes-11"]')).toHaveAttribute(
    'data-tour-target',
    '',
  );
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog).toContainText('Then balance it on Mix');
  await dialog.getByRole('button', { name: 'Back' }).click();
  await expect(dialog).toContainText('A Rhodes loop');
});
