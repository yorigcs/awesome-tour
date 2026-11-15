---

'@awesome-tour/core': minor
'@awesome-tour/react': minor
'@awesome-tour/motion': minor
---

Quality & platform:

- **i18n**: `messages` on `TourProvider`, `Tour.Root`, `Hotspot.Root` and `Checklist.Root` translates every string the primitives render or announce (`TourMessages`, `defaultMessages`, `useTourMessages`).
- **Keyboard**: <kbd>Home</kbd>/<kbd>End</kbd> jump to the first/last visible step; `keyboardNavigation` accepts a key map to remap actions.
- `Tour.Root` `lockScroll` locks page scrolling during modal steps; `viewTransition` morphs the card between steps with the View Transitions API.
- `Tour.Overlay` `cutout="each"` cuts one hole per target; `shape="circle"` (also on `MotionOverlay`). `getSpotlightPath` accepts several rects and a shape; new `useTargetRects` hook.
- `Tour.Portal` / `Hotspot.Portal` `strategy="top-layer"` renders in the browser top layer (Popover API), above any z-index and modal dialogs.
- `frameTarget(frame, target)` points steps at elements inside same-origin iframes.
- Fix: progress no longer counts steps whose async `when` settled to `false`.
