import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const DOCS = 'http://localhost:4322/awesome-tour';

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

test('interactive steps demo advances on user actions', async ({ page }) => {
  await page.goto(`${DOCS}/guides/interactive-steps/`);
  await page.getByRole('button', { name: 'Start tour' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Click the button');
  await page.locator('#interactive-new').click();
  await expect(dialog).toContainText('Name your project');
  await page.locator('#interactive-name').fill('Moon');
  await expect(dialog).toContainText('Save it');
  await page.locator('#interactive-save').click();
  await expect(dialog).toContainText('Done!');
});

test('persistence demo resumes after a simulated reload', async ({ page }) => {
  await page.goto(`${DOCS}/guides/persistence/`);
  await page.getByRole('button', { name: 'Clear storage' }).click();
  await page.getByRole('button', { name: 'Start tour' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Step one');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog).toContainText('Step two');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Simulate reload' }).click();
  await page.getByRole('button', { name: 'Start tour' }).click();
  await expect(page.getByRole('dialog')).toContainText('Step two');
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
  'registry/tour',
  'registry/checklist',
  'registry/hotspot',
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
  await expect(dialog).toContainText('Navegação');
  await expect(dialog.getByRole('button', { name: 'Fechar tour' })).toBeVisible();
  await expect(page.locator('[data-tour-announcer]', { hasText: 'Passo 1 de 3' })).toHaveCount(1);
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

test('the whole site is axe-clean outside demos too', async ({ page }) => {
  await seenLanding(page);
  for (const path of ['', 'guides/targets/', 'registry/']) {
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
  for (const path of ['quick-start', 'guides/styling', 'registry/tour', 'registry/checklist']) {
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
