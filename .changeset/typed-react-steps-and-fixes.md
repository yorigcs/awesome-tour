---

'@awesome-tour/core': patch
'@awesome-tour/react': patch
'@awesome-tour/devtools': patch
---

- `createTour` from `@awesome-tour/react` is typed for React steps, so `title`, `description`, `content`, `side`, `align` and `interactive` type-check even with typed `data` and `when`/`next` callbacks.
- A `TourProvider` (or manager) without a `router` no longer erases the `router` passed to `createTour`.
- `close()` now works on paused tours.
- `setData()` recomputes `progress` immediately, so "Step n of m" reflects `when` conditions that depend on data.
- `checklist.destroy()` disconnects from connected managers.
- `Hotspot` no longer resubscribes on every render when given an inline `anchor()` or selector array; `TourDevtools` no longer resubscribes to every tour on each render when `tours` is omitted.
