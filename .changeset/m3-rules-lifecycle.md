---

'@awesome-tour/core': minor
'@awesome-tour/react': minor
'@awesome-tour/devtools': minor
---

Engine rules & lifecycle:

- **Display rules**: `createTour({ rules })` with `audience`, `schedule`, `frequency` (`once`, `maxShows`, `cooldownMs`), `trigger` (`route`, `signal`, `event`, `delay`, `targetVisible`) and `priority`. The tour manager auto-starts triggered tours when eligible (never interrupting one on screen), records impressions (`TourManagerOptions.impressions` / `TourProvider impressions`), and explains decisions with `manager.explain(id)`. Also `startIfEligible`, `signal`, `resetImpressions`.
- `tour.snooze(ms)` closes a tour and keeps it from auto-starting until then (`snooze` event).
- Step guards: `beforeLeave(ctx, { to, direction })` can keep the user on a step; `canNext(ctx)` gates moving forward live (`state.canNext`, `Tour.Next` disabled).
- `advanceOn: { delay }` auto-advances; `Tour.Content` exposes `data-auto-advance` and `--tour-auto-advance`.
- Persistence: `persist({ migrate })` upgrades progress saved by older versions; new `sessionStorageAdapter` and `httpAdapter` (cached reads, optimistic debounced writes).
- Devtools: a **Rules** tab explains why each tour would or wouldn't show.
