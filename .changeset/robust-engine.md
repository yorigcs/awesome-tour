---
"@awesome-tour/core": minor
"@awesome-tour/react": minor
---

Engine robustness:

- Transitions: `onTargetMissing: 'skip'` runs the previous step's leave hooks once; a failing or timed-out `beforeEnter` (new `enterTimeout`) restores the previous step with its listeners; double `next()`/`prev()` calls are ignored while one resolves; `prev()` re-checks `when`; plugins' `beforeStep` receives an abort `signal`; `setSteps()` removing the current step moves on; `destroy()` leaves the step and detaches plugins.
- Targets removed while their step is shown are detected (`targetLost` event, `onTargetLost: 'reresolve' | 'center' | 'close'`). One shared `MutationObserver` serves every watcher (`subscribeDomActivity`, `getObserverStats`). Shadow DOM: matches from every open root, `inertOthers` and the focus trap pierce roots. iframes: frame targets scroll into view and `advanceOn` events inside the frame are heard. `scroll.offset` keeps targets clear of sticky bars.
- New `tour.use(plugin)` and `manager.connect()`; `TourProvider` and inline `Tour.Root` tours no longer have side effects during render (StrictMode safe) and inline tours are destroyed on unmount. `<Tour.Step>` pushes every prop change to the tour.
- Persistence: `persist` validates saved values, reports failures through `onError`, never overwrites progress saved by a newer tour version, and pauses the tour in other tabs when it starts in one. `httpAdapter` checks responses, retries writes with backoff, flushes with `keepalive` on `pagehide` (`flush()`), can poll for changes (`pollInterval`) and throw on read errors (`readErrors`).
- Rules: impressions record the `outcome`; `frequency.once` accepts `'completed'` and `'seen'`, plus `dismissCooldownMs`. Queued tours are re-checked when they leave the queue. `matchRoute` ignores query strings and hashes.
- React: arrow keys inside sliders, menus, grids and other composite widgets (or `data-tour-keys="ignore"`) are left alone; only the most recently opened tour handles keys; `dir` defaults to the document's; `Tour.Portal` (`strategy: 'auto'`) renders inside an open modal dialog that holds the target (native `<dialog>`, Radix, vaul).
