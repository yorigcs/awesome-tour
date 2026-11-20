import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('checklist completes from signals and tours, persists, and is accessible', async ({
  page,
}) => {
  await page.goto('/');
  const checklist = page.locator('.checklist');
  const progress = checklist.getByRole('progressbar', { name: 'Checklist progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '0');

  // Signals from app code.
  await page.locator('#search').fill('abc');
  await page.getByRole('button', { name: /New pattern/ }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  await expect(
    checklist.getByRole('button', { name: 'Start a pattern' }),
  ).toHaveAccessibleDescription('Completed');

  // Item linked to a tour: starting it from the checklist, finishing completes the item.
  await checklist.getByRole('button', { name: 'Try the CSS-only tour' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('Your arrangement');
  await dialog.getByRole('button', { name: /^(Next|Finish)$/ }).click();
  await dialog.getByRole('button', { name: /^(Next|Finish)$/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(progress).toHaveAttribute('aria-valuenow', '3');

  const results = await new AxeBuilder({ page }).include('.checklist').analyze();
  expect(results.violations).toEqual([]);

  await page.reload();
  await expect(page.locator('.checklist').getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '3',
  );

  await page.getByRole('button', { name: 'Dismiss checklist' }).click();
  await expect(page.locator('.checklist')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show checklist' }).click();
  await expect(page.locator('.checklist')).toBeVisible();
});

test('analytics plugin reports tour events in order', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Your studio');
  await page.keyboard.press('Escape');
  const log = page.getByTestId('event-log');
  await expect(log.locator('li code')).toHaveText([
    'tour_dismissed',
    'step_viewed',
    'step_viewed',
    'tour_started',
  ]);
});
