---
"@awesome-tour/core": minor
"@awesome-tour/react": minor
"@awesome-tour/motion": patch
"@awesome-tour/three": patch
"@awesome-tour/router": patch
"@awesome-tour/devtools": patch
---

- `createTourManager({ clock })`: the manager's "now" for schedules, cooldowns, snoozes and recorded show times (preview a campaign, test rules).
- Logical sides: `side: 'start' | 'end'` follow the reading direction (`PhysicalSide` is exported for the placed side).
- `Tour.Portal` also treats Radix/vaul dialogs (`role="dialog"` without `aria-modal`) as hosts, so a tour pointing into one stays clickable.
- Real READMEs for every package; the docs, playground and examples now run on Loopwork, a beat-maker example app, with new live demos (multi-page, multiple tours, 3D, accessibility, stress lab).
