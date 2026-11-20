# @awesome-tour/router

## 1.0.0

### Major Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`7457d44`](https://github.com/yorigcs/awesome-tour/commit/7457d440182536338adb6d3f7df2994de713f03e) Thanks [@yorigcs](https://github.com/yorigcs)! - 1.0: the API is stable and every package follows semver from here on. Breaking changes only in a major, with a codemod or a migration note.

  Since 0.1: a hardened transition pipeline (rollback, `enterTimeout`, no double hooks), targets that survive re-renders, shadow DOM, iframes and dialogs, StrictMode- and SSR-safe React bindings, resilient locators, goals, experiments, frequency caps, deep links, previews, behavior triggers, ordered checklists, per-locale step text, health checks in CI, a devtools funnel and recorder, dev diagnostics (AT001–AT008), and `@awesome-tour/elements` for apps without React. Display rules now tell completed tours from dismissed ones (`once: true | 'completed' | 'seen'`).

### Patch Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`853ad32`](https://github.com/yorigcs/awesome-tour/commit/853ad32435cd9ee11439354d34f05b4b679ae52f) Thanks [@yorigcs](https://github.com/yorigcs)! - - `createTourManager({ clock })`: the manager's "now" for schedules, cooldowns, snoozes and recorded show times (preview a campaign, test rules).
  - Logical sides: `side: 'start' | 'end'` follow the reading direction (`PhysicalSide` is exported for the placed side).
  - `Tour.Portal` also treats Radix/vaul dialogs (`role="dialog"` without `aria-modal`) as hosts, so a tour pointing into one stays clickable.
  - Real READMEs for every package; the docs, playground and examples now run on Loopwork, a beat-maker example app, with new live demos (multi-page, multiple tours, 3D, accessibility, stress lab).
- Updated dependencies [[`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474), [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474), [`e31dd87`](https://github.com/yorigcs/awesome-tour/commit/e31dd879c5a53a0c7014bbf37537fb3f7ef52f54), [`853ad32`](https://github.com/yorigcs/awesome-tour/commit/853ad32435cd9ee11439354d34f05b4b679ae52f), [`729cdd7`](https://github.com/yorigcs/awesome-tour/commit/729cdd7c56c93f401c7d999898cba22cd2bf5bef), [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474), [`7457d44`](https://github.com/yorigcs/awesome-tour/commit/7457d440182536338adb6d3f7df2994de713f03e)]:
  - @awesome-tour/react@1.0.0

## 0.1.1

### Patch Changes

- [#4](https://github.com/yorigcs/awesome-tour/pull/4) [`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6) Thanks [@yorigcs](https://github.com/yorigcs)! - Published from GitHub Actions through npm trusted publishing, so every package now ships with a
  provenance attestation linking it to the commit and workflow that built it. No code changes.
- Updated dependencies [[`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6)]:
  - @awesome-tour/react@0.1.1

## 0.1.0

Initial release: router adapters for multi-page tours — `@awesome-tour/router/react-router`, `/next` (App Router) and `/tanstack-router`.
