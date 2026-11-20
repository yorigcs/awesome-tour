---
"@awesome-tour/core": minor
"@awesome-tour/react": minor
"@awesome-tour/codemod": patch
---

Developer experience:

- Development warnings with stable codes (AT001–AT007: duplicate step ids, unknown `next`/`advanceOn.to`, invalid selectors, errors nobody listens to, routes without a router, two tours with one id), each explained on the new "Warnings & errors" page. Silent in production builds.
- `createTour` now rejects a string `next` that isn't one of the tour's step ids at compile time.
- Tours as JSON: locator objects (`{ tour }`, `{ role, name }`, `{ text }`, `{ firstOf }`), `goal`, `onTargetLost`, `enterTimeout`, `beforeLeave`, scroll options, logical sides and the new frequency options; `validateTourJSON` checks enum values and locators. The JSON Schema is updated.
- Codemod: joyride's `disableScrolling` becomes `scroll`, and `spotlightPadding` points to the overlay's `padding`.
