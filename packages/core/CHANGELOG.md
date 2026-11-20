# @awesome-tour/core

## 1.0.0

### Major Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`7457d44`](https://github.com/yorigcs/awesome-tour/commit/7457d440182536338adb6d3f7df2994de713f03e) Thanks [@yorigcs](https://github.com/yorigcs)! - 1.0: the API is stable and every package follows semver from here on. Breaking changes only in a major, with a codemod or a migration note.

  Since 0.1: a hardened transition pipeline (rollback, `enterTimeout`, no double hooks), targets that survive re-renders, shadow DOM, iframes and dialogs, StrictMode- and SSR-safe React bindings, resilient locators, goals, experiments, frequency caps, deep links, previews, behavior triggers, ordered checklists, per-locale step text, health checks in CI, a devtools funnel and recorder, dev diagnostics (AT001–AT008), and `@awesome-tour/elements` for apps without React. Display rules now tell completed tours from dismissed ones (`once: true | 'completed' | 'seen'`).

### Minor Changes

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474) Thanks [@yorigcs](https://github.com/yorigcs)! - New, all opt-in:

  - Resilient targets: `byTour('name')`, `byRole('button', { name: 'Export' })`, `byText('…')` and `firstOf(a, b, c)` fallback chains (plus `accessibleName`, `roleOf`). Devtools' element picker now suggests `byTour`/`byRole` when an element has a hook or a role and name.
  - Goals: `createTour({ goal: { signal | event | route | when, within } })` emits `goal` once per run, even after the tour ended; analytics sends `tour_goal_reached` with the time to conversion.
  - Experiments: `createExperiment({ variants, weights, userId | assign, onExposure })` with stable hashing, control groups and `experimentId`/`variant` on analytics events.
  - Manager-wide frequency cap (`createTourManager({ cap: { perSession, cooldownMs } })`, reported as the `cap` rule) and `frequency.perVersion` to show a tour again when its version changes.
  - Deep links: `deepLink(manager)` / `<TourProvider deepLink>` start the tour named in `?tour=id&step=x`.
  - `createFeed` + `useFeed`: a "what's new" feed with read state, and a `help-center` registry item that combines it with the checklist, tours and links.
  - `Tour.Content layout="sheet" | "auto"`: docked to the bottom on small screens (the registry card defaults to `auto`).

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474) Thanks [@yorigcs](https://github.com/yorigcs)! - Developer experience:

  - Development warnings with stable codes (AT001–AT007: duplicate step ids, unknown `next`/`advanceOn.to`, invalid selectors, errors nobody listens to, routes without a router, two tours with one id), each explained on the new "Warnings & errors" page. Silent in production builds.
  - `createTour` now rejects a string `next` that isn't one of the tour's step ids at compile time.
  - Tours as JSON: locator objects (`{ tour }`, `{ role, name }`, `{ text }`, `{ firstOf }`), `goal`, `onTargetLost`, `enterTimeout`, `beforeLeave`, scroll options, logical sides and the new frequency options; `validateTourJSON` checks enum values and locators. The JSON Schema is updated.
  - Codemod: joyride's `disableScrolling` becomes `scroll`, and `spotlightPadding` points to the overlay's `padding`.

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`e31dd87`](https://github.com/yorigcs/awesome-tour/commit/e31dd879c5a53a0c7014bbf37537fb3f7ef52f54) Thanks [@yorigcs](https://github.com/yorigcs)! - - Goals survive reloads: `persist()` saves when a run's goal was armed and reached, and resumes watching it on the next visit (counted once). New `tour.trackGoal(since)` to do it yourself.
  - `manager.getImpression(id)`; launcher items and badges fall back to remembered impressions, so a tour finished in an earlier session isn't shown as "new" again.

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`853ad32`](https://github.com/yorigcs/awesome-tour/commit/853ad32435cd9ee11439354d34f05b4b679ae52f) Thanks [@yorigcs](https://github.com/yorigcs)! - - `createTourManager({ clock })`: the manager's "now" for schedules, cooldowns, snoozes and recorded show times (preview a campaign, test rules).
  - Logical sides: `side: 'start' | 'end'` follow the reading direction (`PhysicalSide` is exported for the placed side).
  - `Tour.Portal` also treats Radix/vaul dialogs (`role="dialog"` without `aria-modal`) as hosts, so a tour pointing into one stays clickable.
  - Real READMEs for every package; the docs, playground and examples now run on Loopwork, a beat-maker example app, with new live demos (multi-page, multiple tours, 3D, accessibility, stress lab).

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`729cdd7`](https://github.com/yorigcs/awesome-tour/commit/729cdd7c56c93f401c7d999898cba22cd2bf5bef) Thanks [@yorigcs](https://github.com/yorigcs)! - - Checklists: `after` (dependencies: locked until done), `optional` items, `section`s; state gains `locked`, `next` and `sections`; `Checklist.Item` exposes `data-locked`/`data-next`.
  - Step text per locale: `title: { en, 'pt-BR' }` (also descriptions, content, announcements, surveys and JSON), picked by the `locale` of `TourProvider`/`Tour.Root` or `<html lang>`; `localize`, `useLocalize`.
  - Previews: `TourProvider preview={{ load }}` / `previewFromUrl` run a draft from `?tour-preview=id` without saving, tracking or rules (`tour.preview`, `data-preview`).
  - Behavior triggers: `dwell`, `idle`, `rageClick` and `repeat`.
  - Tour health checks: `auditTours`, `npx awesome-tour-check <url>`, `expectToursHealthy(page)`.
  - Devtools: a Funnel tab (reach and drop-off per step) and a Recorder (pick elements, play, copy as JSON or code).
  - New package `@awesome-tour/elements`: `mountTour()` and an `<awesome-tour>` custom element, no React needed.
  - New dev warning AT008 (checklist item after an unknown item).

- [#6](https://github.com/yorigcs/awesome-tour/pull/6) [`c1c3e3a`](https://github.com/yorigcs/awesome-tour/commit/c1c3e3a2a377ba4e3f829ec4615c12c0766d3474) Thanks [@yorigcs](https://github.com/yorigcs)! - Engine robustness:

  - Transitions: `onTargetMissing: 'skip'` runs the previous step's leave hooks once; a failing or timed-out `beforeEnter` (new `enterTimeout`) restores the previous step with its listeners; double `next()`/`prev()` calls are ignored while one resolves; `prev()` re-checks `when`; plugins' `beforeStep` receives an abort `signal`; `setSteps()` removing the current step moves on; `destroy()` leaves the step and detaches plugins.
  - Targets removed while their step is shown are detected (`targetLost` event, `onTargetLost: 'reresolve' | 'center' | 'close'`). One shared `MutationObserver` serves every watcher (`subscribeDomActivity`, `getObserverStats`). Shadow DOM: matches from every open root, `inertOthers` and the focus trap pierce roots. iframes: frame targets scroll into view and `advanceOn` events inside the frame are heard. `scroll.offset` keeps targets clear of sticky bars.
  - New `tour.use(plugin)` and `manager.connect()`; `TourProvider` and inline `Tour.Root` tours no longer have side effects during render (StrictMode safe) and inline tours are destroyed on unmount. `<Tour.Step>` pushes every prop change to the tour.
  - Persistence: `persist` validates saved values, reports failures through `onError`, never overwrites progress saved by a newer tour version, and pauses the tour in other tabs when it starts in one. `httpAdapter` checks responses, retries writes with backoff, flushes with `keepalive` on `pagehide` (`flush()`), can poll for changes (`pollInterval`) and throw on read errors (`readErrors`).
  - Rules: impressions record the `outcome`; `frequency.once` accepts `'completed'` and `'seen'`, plus `dismissCooldownMs`. Queued tours are re-checked when they leave the queue. `matchRoute` ignores query strings and hashes.
  - React: arrow keys inside sliders, menus, grids and other composite widgets (or `data-tour-keys="ignore"`) are left alone; only the most recently opened tour handles keys; `dir` defaults to the document's; `Tour.Portal` (`strategy: 'auto'`) renders inside an open modal dialog that holds the target (native `<dialog>`, Radix, vaul).

## 0.1.1

### Patch Changes

- [#4](https://github.com/yorigcs/awesome-tour/pull/4) [`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6) Thanks [@yorigcs](https://github.com/yorigcs)! - Published from GitHub Actions through npm trusted publishing, so every package now ships with a
  provenance attestation linking it to the commit and workflow that built it. No code changes.

## 0.1.0

Initial release: the framework-agnostic engine — steps with targets (selectors, refs, anchors, virtual elements, iframes), branching and conditional steps, interactive steps (`advanceOn` events, predicates, signals, delays), step guards (`beforeLeave`, `canNext`), multi-page tours with a router adapter, persistence (`persist()` with versions and migrations; localStorage, sessionStorage and HTTP adapters), analytics, checklists, a tour manager with a priority queue, ambient/blocking layers and display rules (audience, schedule, frequency, snooze, triggers, `explain()`). Extra entries: `@awesome-tour/core/json` (tours as data + JSON Schema) and `@awesome-tour/core/adapters` (PostHog, Segment, Mixpanel, GA4).
