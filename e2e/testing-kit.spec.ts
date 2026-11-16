// Our own e2e, written with the published Playwright fixture.
import { expect, test } from '@awesome-tour/testing/playwright';

test('the tour fixture drives and asserts a tour', async ({ page, tour }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await tour.expectStep('welcome');
  await tour.next();
  await tour.expectStep('sidebar');
  await tour.expectTarget('nav.sidebar');
  await tour.expectNotObscuring('nav.sidebar');
  await tour.prev();
  await tour.expectStep('welcome');
  await tour.close();
  await tour.expectClosed();
  await expect(page.getByRole('button', { name: 'Start onboarding' })).toBeFocused();
});
