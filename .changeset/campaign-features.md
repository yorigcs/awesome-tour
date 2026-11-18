---
"@awesome-tour/core": minor
"@awesome-tour/react": minor
"@awesome-tour/devtools": minor
---

New, all opt-in:

- Resilient targets: `byTour('name')`, `byRole('button', { name: 'Export' })`, `byText('…')` and `firstOf(a, b, c)` fallback chains (plus `accessibleName`, `roleOf`). Devtools' element picker now suggests `byTour`/`byRole` when an element has a hook or a role and name.
- Goals: `createTour({ goal: { signal | event | route | when, within } })` emits `goal` once per run, even after the tour ended; analytics sends `tour_goal_reached` with the time to conversion.
- Experiments: `createExperiment({ variants, weights, userId | assign, onExposure })` with stable hashing, control groups and `experimentId`/`variant` on analytics events.
- Manager-wide frequency cap (`createTourManager({ cap: { perSession, cooldownMs } })`, reported as the `cap` rule) and `frequency.perVersion` to show a tour again when its version changes.
- Deep links: `deepLink(manager)` / `<TourProvider deepLink>` start the tour named in `?tour=id&step=x`.
- `createFeed` + `useFeed`: a "what's new" feed with read state, and a `help-center` registry item that combines it with the checklist, tours and links.
- `Tour.Content layout="sheet" | "auto"`: docked to the bottom on small screens (the registry card defaults to `auto`).
