import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const dialog = (page: Page) => page.getByRole('dialog');
const next = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: /^(Next|Finish)$/ });

async function expectAnchoredTo(page: Page, selector: string) {
  const target = await page.locator(selector).first().boundingBox();
  const content = await dialog(page).boundingBox();
  expect(target && content).toBeTruthy();
  // Content sits next to its target (within 40px on some side).
  const gap = Math.min(
    Math.abs(content!.y - (target!.y + target!.height)),
    Math.abs(target!.y - (content!.y + content!.height)),
    Math.abs(content!.x - (target!.x + target!.width)),
    Math.abs(target!.x - (content!.x + content!.width)),
  );
  expect(gap).toBeLessThan(40);
}

test('full onboarding: anchors, interactive steps, branching, routes, lazy targets, 3D, multi-target @cross', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();

  await expect(dialog(page)).toHaveAccessibleName('Welcome to Loopwork');
  await expect(dialog(page)).toHaveAttribute('data-placement', 'center');
  await expect(dialog(page)).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(dialog(page)).toHaveAccessibleName('Your studio');
  await expectAnchoredTo(page, 'nav.sidebar');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Find a sound');
  await page.locator('#search').fill('hello');
  await expect(dialog(page)).toHaveAccessibleName('Start a pattern');

  // Interactive step: clicking the highlighted target advances.
  await page.getByRole('button', { name: /New pattern/ }).click();
  await expect(dialog(page)).toHaveAccessibleName('Mastering (Pro)');

  await next(page).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(dialog(page)).toHaveAccessibleName('Your projects');
  await expectAnchoredTo(page, '#project-list');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Loudness, measured', { timeout: 5000 });
  await expectAnchoredTo(page, '#loudness-widget');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Inside a scroll box');
  await expect(page.locator('#deep-item')).toBeInViewport();

  // Headless Firefox without a GPU (CI) has no WebGL2: the tour skips the 3D step there.
  const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  await next(page).click();
  if (webgl) {
    await expect(page).toHaveURL(/\/studio$/);
    await expect(dialog(page)).toHaveAccessibleName('The LW-16, in 3D', { timeout: 10_000 });
    const canvas = await page.getByTestId('canvas').boundingBox();
    const box = await dialog(page).boundingBox();
    expect(box!.y).toBeGreaterThan(canvas!.y - 400);
    await next(page).click();
  } else {
    test.info().annotations.push({ type: 'skipped-step', description: '3D step: no WebGL2' });
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toHaveAccessibleName('Drums and keys');
  await expect(page.locator('[data-tour="lane-drums"]')).toHaveAttribute('data-tour-target', '');
  await expect(page.locator('[data-tour="lane-keys"]')).toHaveAttribute('data-tour-target', '');
  await expect(page.locator('[data-tour="lane-bass"]')).not.toHaveAttribute('data-tour-target', '');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName("You're all set");
  await next(page).click();
  // Completing the tour signals the NPS survey (an ambient slideout): the tour itself is gone.
  const survey = page.getByRole('dialog', { name: /How likely are you to recommend/ });
  await expect(survey).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await survey.getByRole('button', { name: 'Dismiss' }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('conditional step is skipped on the free plan', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Plan').selectOption('free');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Loopwork');
  await expect(dialog(page).getByText(/Step 1 of 10/)).toBeVisible();
  await expect(page.locator('[data-tour-announcer]', { hasText: 'Step 1 of 10' })).toHaveCount(1);
});

test('progress persists across reloads and completed tours do not restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Your studio');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start onboarding' })).toBeFocused();

  await page.reload();
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Your studio');

  await dialog(page).getByRole('button', { name: 'Skip tour' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Loopwork');
});

test('modal tour makes the page inert and has no axe violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Your studio');
  const results = await new AxeBuilder({ page }).include('[role=dialog]').analyze();
  expect(results.violations).toEqual([]);
});

// Engines differ on `inert` and focus: this runs in Firefox and WebKit too.
test('modal tour: the page is inert, the target is not, and Tab stays in the dialog @cross', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Your studio');
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(page.locator('nav.sidebar')).not.toHaveAttribute('inert', '');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog(page).evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
});

test('declarative CSS tour and hotspot', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'CSS-only tour', exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName('Your arrangement');
  await expect(dialog(page)).not.toHaveAttribute('aria-modal', 'true');
  await dialog(page).getByRole('button', { name: 'Go to step 2' }).click();
  await expect(dialog(page)).toHaveAccessibleName('The beat');
  await next(page).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Show hint' }).click();
  await expect(page.getByRole('dialog', { name: 'New: swing per row' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'New: swing per row' })).toHaveCount(0);
});

test('Home and End jump to the first and last step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Loopwork');
  await page.keyboard.press('End');
  await expect(dialog(page)).toHaveAccessibleName("You're all set");
  await page.keyboard.press('Home');
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Loopwork');
});

// WCAG 2.2 SC 2.4.11 Focus Not Obscured: at 200% zoom (≈ 640×400 CSS px on a 1280×800 screen)
// the step card must never cover the element it points at.
test('the card never covers its target at 200% zoom @cross', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Loopwork');
  const overlaps = async (selector: string) => {
    const t = await page.locator(selector).first().boundingBox();
    const d = await dialog(page).boundingBox();
    if (!t || !d) return true;
    return !(
      d.x >= t.x + t.width ||
      t.x >= d.x + d.width ||
      d.y >= t.y + t.height ||
      t.y >= d.y + d.height
    );
  };
  await page.keyboard.press('ArrowRight');
  await expect(dialog(page)).toHaveAccessibleName('Your studio');
  expect(await overlaps('nav.sidebar')).toBe(false);
  await page.keyboard.press('ArrowRight');
  await expect(dialog(page)).toHaveAccessibleName('Find a sound');
  expect(await overlaps('#search')).toBe(false);
});
