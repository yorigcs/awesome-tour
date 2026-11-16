import { expect, test } from '@playwright/test';

test('devtools stay usable during a modal tour and can jump between steps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding' }).click();
  const dialog = page.getByRole('dialog', { name: 'Welcome to Acme' });
  await expect(dialog).toBeVisible();

  // The page is inert, but the devtools host is kept interactive (data-tour-keep).
  await expect(page.locator('#root')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Open tour devtools' }).click();
  const panel = page.getByRole('region', { name: 'awesome-tour devtools' });
  await expect(panel).toBeVisible();

  const projects = panel.getByRole('button', { name: /^\d+ projects/ });
  await expect(projects).toContainText('on /projects');
  await projects.click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('dialog', { name: 'Projects page' })).toBeVisible();
  await expect(projects).toHaveAttribute('aria-current', 'step');
  await expect(projects).toContainText('found');

  // Shortcut keys inside devtools don't drive the tour.
  await projects.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog', { name: 'Projects page' })).toBeVisible();

  await panel.getByRole('button', { name: /^Events/ }).click();
  await expect(
    panel.getByRole('list', { name: 'Tour events' }).getByRole('listitem').first(),
  ).toContainText('stepChange');
});

test('the element picker suggests a stable target for any element', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open tour devtools' }).click();
  const panel = page.getByRole('region', { name: 'awesome-tour devtools' });
  await panel.getByRole('button', { name: 'Pick element' }).click();
  await page.locator('#search').click();
  const picked = panel.getByRole('region', { name: 'Picked element' });
  await expect(picked).toContainText("target: '#search'");
  await panel.getByRole('button', { name: 'Pick element' }).click();
  await page.locator('nav.sidebar a').first().click();
  // The sidebar is registered with useTourAnchor('nav').
  await expect(picked).toContainText("target: anchor('nav')");
  await expect(page).toHaveURL(/\/$/); // the pick didn't follow the link
});
