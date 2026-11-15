---

'@awesome-tour/core': minor
'@awesome-tour/react': minor
'@awesome-tour/devtools': minor
'@awesome-tour/testing': minor
'@awesome-tour/codemod': minor
---

Developer experience:

- **`@awesome-tour/testing`** (new): Playwright fixture (`@awesome-tour/testing/playwright`), `renderWithTour` for React Testing Library, `waitForStep`, `waitForTourEnd`, `mockRect`/`mockLayout`, `createMemoryRouter`.
- **`@awesome-tour/codemod`** (new): `npx @awesome-tour/codemod joyride|shepherd|driver <paths>` rewrites step definitions and leaves TODOs for manual changes.
- **Tours as data**: `@awesome-tour/core/json` — `fromJSON(doc, { actions })`, `validateTourJSON`, and a JSON Schema at `@awesome-tour/core/schema.json`.
- **Analytics adapters**: `@awesome-tour/core/adapters` — `posthogTracker`, `segmentTracker`, `mixpanelTracker`, `ga4Tracker`.
- **Devtools**: element picker (suggests an anchor, test id, id or accessible name before a structural path, with a step snippet) and "Export JSON".
- Primitives: `Tour.Next/Prev/Close/Skip` render `data-tour-next|prev|close|skip`; `useTourAnchor` marks its element with `data-tour-anchor`.
