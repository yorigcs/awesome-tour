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

test('full onboarding: anchors, interactive steps, branching, routes, lazy targets, 3D, multi-target', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();

  await expect(dialog(page)).toHaveAccessibleName('Welcome to Acme');
  await expect(dialog(page)).toHaveAttribute('data-placement', 'center');
  await expect(dialog(page)).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(dialog(page)).toHaveAccessibleName('Navigation');
  await expectAnchoredTo(page, 'nav.sidebar');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Try the search');
  await page.locator('#search').fill('hello');
  await expect(dialog(page)).toHaveAccessibleName('Create a project');

  // Interactive step: clicking the highlighted target advances.
  await page.getByRole('button', { name: /New project/ }).click();
  await expect(dialog(page)).toHaveAccessibleName('Admin panel');

  await next(page).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(dialog(page)).toHaveAccessibleName('Projects page');
  await expectAnchoredTo(page, '#project-list');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Lazy content', { timeout: 5000 });
  await expectAnchoredTo(page, '#analytics-widget');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Scroll containers');
  await expect(page.locator('#deep-item')).toBeInViewport();

  await next(page).click();
  await expect(page).toHaveURL(/\/3d$/);
  await expect(dialog(page)).toHaveAccessibleName('3D targets', { timeout: 10_000 });
  const canvas = await page.getByTestId('canvas').boundingBox();
  const box = await dialog(page).boundingBox();
  expect(box!.y).toBeGreaterThan(canvas!.y - 400);

  await next(page).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toHaveAccessibleName('Multiple targets');
  await expect(page.locator('#stat-1')).toHaveAttribute('data-tour-target', '');
  await expect(page.locator('#stat-3')).toHaveAttribute('data-tour-target', '');
  await expect(page.locator('#stat-2')).not.toHaveAttribute('data-tour-target', '');

  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName("You're all set");
  await next(page).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('conditional step is skipped for members', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Role').selectOption('member');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Acme');
  await expect(dialog(page).getByText(/Step 1 of 10/)).toBeVisible();
  await expect(page.locator('[data-tour-announcer]', { hasText: 'Step 1 of 10' })).toHaveCount(1);
});

test('progress persists across reloads and completed tours do not restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Navigation');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start onboarding' })).toBeFocused();

  await page.reload();
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Navigation');

  await dialog(page).getByRole('button', { name: 'Skip tour' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Acme');
});

test('modal tour makes the page inert and has no axe violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await next(page).click();
  await expect(dialog(page)).toHaveAccessibleName('Navigation');
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(page.locator('nav.sidebar')).not.toHaveAttribute('inert', '');
  const results = await new AxeBuilder({ page }).include('[role=dialog]').analyze();
  expect(results.violations).toEqual([]);

  // Tab stays inside the dialog.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog(page).evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
});

test('declarative CSS tour and hotspot', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'CSS-only tour', exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName('Your numbers');
  await expect(dialog(page)).not.toHaveAttribute('aria-modal', 'true');
  await dialog(page).getByRole('button', { name: 'Go to step 2' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Reports');
  await next(page).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Show hint' }).click();
  await expect(page.getByRole('dialog', { name: 'New: reports' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'New: reports' })).toHaveCount(0);
});

test('Home and End jump to the first and last step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Acme');
  await page.keyboard.press('End');
  await expect(dialog(page)).toHaveAccessibleName("You're all set");
  await page.keyboard.press('Home');
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Acme');
});

// WCAG 2.2 SC 2.4.11 Focus Not Obscured: at 200% zoom (≈ 640×400 CSS px on a 1280×800 screen)
// the step card must never cover the element it points at.
test('the card never covers its target at 200% zoom', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Welcome to Acme');
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
  await expect(dialog(page)).toHaveAccessibleName('Navigation');
  expect(await overlaps('nav.sidebar')).toBe(false);
  await page.keyboard.press('ArrowRight');
  await expect(dialog(page)).toHaveAccessibleName('Try the search');
  expect(await overlaps('#search')).toBe(false);
});
