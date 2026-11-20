import { expectToursHealthy } from '@awesome-tour/testing/playwright';
import { expect, test } from '@playwright/test';

test('every playground tour still finds its targets', async ({ page }) => {
  const audits = await expectToursHealthy(page, { url: '/', timeout: 5000 });
  const onboarding = audits.find((a) => a.tourId === 'onboarding')!;
  expect(onboarding.steps.find((s) => s.stepId === 'library')).toMatchObject({ status: 'found' });
  expect(onboarding.steps.find((s) => s.stepId === 'model')).toMatchObject({ status: 'found' });
  // The audit leaves the app where it found it.
  await expect(page).toHaveURL(/\/$/);
});
