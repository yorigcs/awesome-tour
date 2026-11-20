# @awesome-tour/testing

## 1.0.0

### Major Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`7457d44`](https://github.com/yorigcs/awesome-tour/commit/7457d440182536338adb6d3f7df2994de713f03e) Thanks [@yorigcs](https://github.com/yorigcs)! - 1.0: the API is stable and every package follows semver from here on. Breaking changes only in a major, with a codemod or a migration note.

  Since 0.1: a hardened transition pipeline (rollback, `enterTimeout`, no double hooks), targets that survive re-renders, shadow DOM, iframes and dialogs, StrictMode- and SSR-safe React bindings, resilient locators, goals, experiments, frequency caps, deep links, previews, behavior triggers, ordered checklists, per-locale step text, health checks in CI, a devtools funnel and recorder, dev diagnostics (AT001–AT008), and `@awesome-tour/elements` for apps without React. Display rules now tell completed tours from dismissed ones (`once: true | 'completed' | 'seen'`).

### Minor Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`729cdd7`](https://github.com/yorigcs/awesome-tour/commit/729cdd7c56c93f401c7d999898cba22cd2bf5bef) Thanks [@yorigcs](https://github.com/yorigcs)! - - Checklists: `after` (dependencies: locked until done), `optional` items, `section`s; state gains `locked`, `next` and `sections`; `Checklist.Item` exposes `data-locked`/`data-next`.
  - Step text per locale: `title: { en, 'pt-BR' }` (also descriptions, content, announcements, surveys and JSON), picked by the `locale` of `TourProvider`/`Tour.Root` or `<html lang>`; `localize`, `useLocalize`.
  - Previews: `TourProvider preview={{ load }}` / `previewFromUrl` run a draft from `?tour-preview=id` without saving, tracking or rules (`tour.preview`, `data-preview`).
  - Behavior triggers: `dwell`, `idle`, `rageClick` and `repeat`.
  - Tour health checks: `auditTours`, `npx awesome-tour-check <url>`, `expectToursHealthy(page)`.
  - Devtools: a Funnel tab (reach and drop-off per step) and a Recorder (pick elements, play, copy as JSON or code).
  - New package `@awesome-tour/elements`: `mountTour()` and an `<awesome-tour>` custom element, no React needed.
  - New dev warning AT008 (checklist item after an unknown item).

### Patch Changes

- Updated dependencies [[`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474), [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474), [`e31dd87`](https://github.com/yorigcs/awesome-tour/commit/e31dd879c5a53a0c7014bbf37537fb3f7ef52f54), [`853ad32`](https://github.com/yorigcs/awesome-tour/commit/853ad32435cd9ee11439354d34f05b4b679ae52f), [`729cdd7`](https://github.com/yorigcs/awesome-tour/commit/729cdd7c56c93f401c7d999898cba22cd2bf5bef), [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474), [`7457d44`](https://github.com/yorigcs/awesome-tour/commit/7457d440182536338adb6d3f7df2994de713f03e)]:
  - @awesome-tour/core@1.0.0
  - @awesome-tour/react@1.0.0

## 0.1.1

### Patch Changes

- [#4](https://github.com/yorigcs/awesome-tour/pull/4) [`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6) Thanks [@yorigcs](https://github.com/yorigcs)! - Published from GitHub Actions through npm trusted publishing, so every package now ships with a
  provenance attestation linking it to the commit and workflow that built it. No code changes.
- Updated dependencies [[`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6)]:
  - @awesome-tour/core@0.1.1
  - @awesome-tour/react@0.1.1

## 0.1.0

Initial release: a Playwright `tour` fixture, `renderWithTour` for React Testing Library, `waitForStep`, layout mocks and an in-memory router.
