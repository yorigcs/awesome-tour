import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('an ambient banner shows on Home alongside a tour, and is dismissible', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Stems export is here' });
  await expect(banner).toBeVisible();
  // Ambient: a tour can still start while the banner is up.
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Welcome to Loopwork');
  await page.keyboard.press('Escape');
  const results = await new AxeBuilder({ page })
    .include('[data-slot=announcement-banner]')
    .analyze();
  expect(results.violations).toEqual([]);
  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(400);
  await expect(page.getByRole('region', { name: 'Stems export is here' })).toHaveCount(0);
});

test('the NPS survey gates Next on a score, skips the follow-up for promoters, and submits', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await page.keyboard.press('End');
  await expect(page.getByRole('dialog')).toHaveAccessibleName("You're all set");
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^(Next|Finish)$/ })
    .click();

  const survey = page.getByRole('dialog', { name: /How likely are you to recommend/ });
  await expect(survey).toBeVisible();
  const submit = survey.getByRole('button', { name: /Next|Submit/ });
  await expect(submit).toBeDisabled();
  await survey.getByRole('radio', { name: '9' }).click();
  await expect(survey.getByRole('radio', { name: '9' })).toHaveAttribute('aria-checked', 'true');
  await submit.click();
  await expect(survey).toHaveCount(0);
  await expect(page.getByTestId('event-log')).toContainText('survey_submitted');
});

test('the help launcher replays tours and shows what is new', async ({ page }) => {
  await page.goto('/');
  const help = page.getByRole('button', { name: 'Help' });
  await help.click();
  const panel = page.getByRole('dialog', { name: 'Help center' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: /Studio tour/ })).toContainText('New');
  await panel.getByRole('button', { name: /Studio tour/ }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Welcome to Loopwork');
});
