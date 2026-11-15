---

'@awesome-tour/core': minor
'@awesome-tour/motion': patch
---

- Steps are only shown once the current path matches their `route`. If navigation is blocked, redirected or times out, the step stays hidden (`phase: 'resolving'`) until the user gets there, instead of resolving targets on the wrong page.
- Pattern routes (`/projects/:id`, `/docs/*`) are no longer passed to `navigate()`: the step waits for the user to reach a matching page.
- `matchRoute` is now the default matcher for every router adapter, including `createBrowserRouter()` and custom adapters without `match` (previously an exact comparison). `createBrowserRouter` accepts a `match` option.
- `readTourProgress(adapter, tourId, { key })` accepts the custom `key` given to `persist()`.
- `MotionContent` `animateStepChange` animates the content element itself instead of an extra wrapper `div`, so the card's flex/grid layout applies to its children.
