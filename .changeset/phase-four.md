---
"@awesome-tour/core": minor
"@awesome-tour/react": minor
"@awesome-tour/devtools": minor
"@awesome-tour/testing": minor
"@awesome-tour/elements": minor
---

- Checklists: `after` (dependencies: locked until done), `optional` items, `section`s; state gains `locked`, `next` and `sections`; `Checklist.Item` exposes `data-locked`/`data-next`.
- Step text per locale: `title: { en, 'pt-BR' }` (also descriptions, content, announcements, surveys and JSON), picked by the `locale` of `TourProvider`/`Tour.Root` or `<html lang>`; `localize`, `useLocalize`.
- Previews: `TourProvider preview={{ load }}` / `previewFromUrl` run a draft from `?tour-preview=id` without saving, tracking or rules (`tour.preview`, `data-preview`).
- Behavior triggers: `dwell`, `idle`, `rageClick` and `repeat`.
- Tour health checks: `auditTours`, `npx awesome-tour-check <url>`, `expectToursHealthy(page)`.
- Devtools: a Funnel tab (reach and drop-off per step) and a Recorder (pick elements, play, copy as JSON or code).
- New package `@awesome-tour/elements`: `mountTour()` and an `<awesome-tour>` custom element, no React needed.
- New dev warning AT008 (checklist item after an unknown item).
