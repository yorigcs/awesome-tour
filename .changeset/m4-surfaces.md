---

'@awesome-tour/core': minor
'@awesome-tour/react': minor
---

New surfaces, in a separate entry: `@awesome-tour/react/surfaces`.

- **Announcements**: `createAnnouncement({ variant: 'banner' | 'toast' | 'slideout' | 'modal', … })` — one-step tours with a presentation, so they get display rules, triggers, snooze, impressions and analytics. Parts: `Announcement.Root/Portal/Content/Title/Description/Body/Action/Snooze/Dismiss`. `autoDismiss` for toasts.
- **Surveys**: `createSurvey({ questions })` with `nps`, `csat`, `ces` and `text` questions, conditional follow-ups (`when`), Next gated until answered, `onSubmit(answers)`, `npsCategory()`. Parts: `Survey.Root/Portal/Content/Prompt/Scale/Comment/When/Progress/Back/Next/Dismiss`; `Scale` is an accessible radio group.
- **Launcher**: a resource center — `Launcher.Root/Trigger/Portal/Content/Item/Badge`, `useLauncherStatus()`; items restart tours and expose `data-status`.
- **Layers**: `createTour({ layer: 'ambient' })` for banners/toasts that show alongside anything and never hold the manager's queue (`blocking` by default).
- **Hotspot**: `id` + `persistence` remember a hint was opened (`data-seen`), `once` hides it afterwards, `trigger: 'hover'`, and beacons hide while a modal tour is on screen (`hideDuringTours`).
- New messages: `dismiss`, `scaleLow`, `scaleHigh`.
