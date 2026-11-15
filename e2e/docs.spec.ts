import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const DOCS = 'http://localhost:4322/awesome-tour';

test('landing page tour runs on the docs site itself', async ({ page }) => {
  await page.goto(`${DOCS}/`);
  await page.getByRole('link', { name: 'Take the tour' }).click();
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
];

for (const path of DEMO_PAGES) {
  test(`demos on /${path} have no axe violations`, async ({ page }) => {
    await page.goto(`${DOCS}/${path}/`);
    await page.locator('.at-frame').first().waitFor();
    const results = await new AxeBuilder({ page }).include('.at-frame').analyze();
    expect(results.violations).toEqual([]);
  });
}
