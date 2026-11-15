# @awesome-tour/testing

Test helpers for [awesome-tour](https://yorigcs.github.io/awesome-tour/):

- `@awesome-tour/testing/playwright` — Playwright `test` with a `tour` fixture (`expectStep`, `next`, `expectNotObscuring`…).
- `@awesome-tour/testing/react` — `renderWithTour` (React Testing Library inside a `TourProvider`).
- `@awesome-tour/testing` — `waitForStep`, `waitForTourEnd`, `mockRect` / `mockLayout`, `createMemoryRouter`.

```ts
import { expect, test } from '@awesome-tour/testing/playwright';

test('onboarding', async ({ page, tour }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start' }).click();
  await tour.expectStep('welcome');
  await tour.next();
});
```

Guide: https://yorigcs.github.io/awesome-tour/guides/testing/
