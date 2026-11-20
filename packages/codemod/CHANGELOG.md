# @awesome-tour/codemod

## 1.0.0

### Major Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`7457d44`](https://github.com/yorigcs/awesome-tour/commit/7457d440182536338adb6d3f7df2994de713f03e) Thanks [@yorigcs](https://github.com/yorigcs)! - 1.0: the API is stable and every package follows semver from here on. Breaking changes only in a major, with a codemod or a migration note.

  Since 0.1: a hardened transition pipeline (rollback, `enterTimeout`, no double hooks), targets that survive re-renders, shadow DOM, iframes and dialogs, StrictMode- and SSR-safe React bindings, resilient locators, goals, experiments, frequency caps, deep links, previews, behavior triggers, ordered checklists, per-locale step text, health checks in CI, a devtools funnel and recorder, dev diagnostics (AT001–AT008), and `@awesome-tour/elements` for apps without React. Display rules now tell completed tours from dismissed ones (`once: true | 'completed' | 'seen'`).

### Patch Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474) Thanks [@yorigcs](https://github.com/yorigcs)! - Developer experience:

  - Development warnings with stable codes (AT001–AT007: duplicate step ids, unknown `next`/`advanceOn.to`, invalid selectors, errors nobody listens to, routes without a router, two tours with one id), each explained on the new "Warnings & errors" page. Silent in production builds.
  - `createTour` now rejects a string `next` that isn't one of the tour's step ids at compile time.
  - Tours as JSON: locator objects (`{ tour }`, `{ role, name }`, `{ text }`, `{ firstOf }`), `goal`, `onTargetLost`, `enterTimeout`, `beforeLeave`, scroll options, logical sides and the new frequency options; `validateTourJSON` checks enum values and locators. The JSON Schema is updated.
  - Codemod: joyride's `disableScrolling` becomes `scroll`, and `spotlightPadding` points to the overlay's `padding`.

## 0.1.1

### Patch Changes

- [#4](https://github.com/yorigcs/awesome-tour/pull/4) [`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6) Thanks [@yorigcs](https://github.com/yorigcs)! - Published from GitHub Actions through npm trusted publishing, so every package now ships with a
  provenance attestation linking it to the commit and workflow that built it. No code changes.

## 0.1.0

Initial release: codemods to migrate from react-joyride, Shepherd and driver.js (`npx @awesome-tour/codemod <transform> <paths>`).
