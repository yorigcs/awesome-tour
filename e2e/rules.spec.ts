import { expect, test } from '@playwright/test';

test('a rule-triggered tour starts on its route, snoozes, and devtools explains why it stays hidden', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('link', { name: 'Library' }).click();
  const news = page.getByRole('dialog', { name: 'New: project folders' });
  await expect(news).toBeVisible();
  // Non-modal: the page stays usable.
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');

  await news.getByRole('button', { name: 'Remind me tomorrow' }).click();
  await expect(news).toHaveCount(0);

  await page.getByRole('link', { name: 'Arrange' }).click();
  await page.getByRole('link', { name: 'Library' }).click();
  await page.waitForTimeout(500);
  await expect(news).toHaveCount(0);

  await page.getByRole('button', { name: 'Open tour devtools' }).click();
  const panel = page.getByRole('region', { name: 'awesome-tour devtools' });
  await panel.getByRole('button', { name: 'Rules' }).click();
  const rules = panel.getByRole('list', { name: 'Rules for whats-new' });
  await expect(rules).toContainText('snoozed until');

  await panel.getByRole('button', { name: 'Reset all impressions' }).click();
  await expect(rules).not.toContainText('snoozed until');
});

test('a triggered tour never interrupts another tour on screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Welcome to Loopwork');
  // Navigating to the trigger route while onboarding runs doesn't open "What's new".
  await page.evaluate(() => {
    history.pushState(null, '', '/library');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog', { name: 'New: project folders' })).toHaveCount(0);
});
