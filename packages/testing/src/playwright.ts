/**
 * Playwright helpers for end-to-end tests of tours.
 *
 * @example
 * import { expect, test } from '@awesome-tour/testing/playwright';
 *
 * test('onboarding', async ({ page, tour }) => {
 *   await page.goto('/');
 *   await page.getByRole('button', { name: 'Start' }).click();
 *   await tour.expectStep('welcome');
 *   await tour.next();
 *   await tour.expectStep('search');
 * });
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test';

export interface TourHelpers {
  /** The step on screen: `role="dialog"` with `data-step`. */
  readonly dialog: Locator;
  /** Waits for the step with this id (its `data-step`) to be visible and ready. */
  expectStep(stepId: string): Promise<void>;
  /** Waits until no tour step is on screen. */
  expectClosed(): Promise<void>;
  /** Asserts the element is highlighted by the current step (`data-tour-target`). */
  expectTarget(target: string | Locator): Promise<void>;
  /** Asserts the dialog does not cover the element (WCAG 2.4.11 Focus Not Obscured). */
  expectNotObscuring(target: string | Locator): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  close(): Promise<void>;
  skip(): Promise<void>;
}

export function tourHelpers(page: Page): TourHelpers {
  const dialog = page.locator('[role="dialog"][data-step]');
  const locate = (target: string | Locator) =>
    typeof target === 'string' ? page.locator(target).first() : target;
  const click = (attr: string) => dialog.locator(`[${attr}]`).first().click();

  return {
    dialog,
    async expectStep(stepId) {
      const step = page.locator(`[role="dialog"][data-step="${stepId}"]`);
      await expect(step).toBeVisible();
      await expect(step).toHaveAttribute('data-phase', 'ready');
    },
    async expectClosed() {
      await expect(dialog).toHaveCount(0);
    },
    async expectTarget(target) {
      await expect(locate(target)).toHaveAttribute('data-tour-target', '');
    },
    async expectNotObscuring(target) {
      const t = await locate(target).boundingBox();
      const d = await dialog.boundingBox();
      if (!t || !d) throw new Error('[awesome-tour/testing] target or dialog is not visible');
      const overlap = !(
        d.x >= t.x + t.width ||
        t.x >= d.x + d.width ||
        d.y >= t.y + t.height ||
        t.y >= d.y + d.height
      );
      expect(overlap, 'the tour step covers its target').toBe(false);
    },
    next: () => click('data-tour-next'),
    prev: () => click('data-tour-prev'),
    close: () => click('data-tour-close'),
    skip: () => click('data-tour-skip'),
  };
}

/** Playwright's `test` with a `tour` fixture. */
export const test = base.extend<{ tour: TourHelpers }>({
  tour: async ({ page }, use) => {
    await use(tourHelpers(page));
  },
});

export { expect };
