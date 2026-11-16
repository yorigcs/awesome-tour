# @awesome-tour/core

## 0.1.1

### Patch Changes

- [#4](https://github.com/yorigcs/awesome-tour/pull/4) [`fdb446f`](https://github.com/yorigcs/awesome-tour/commit/fdb446fc1533e490e2db2684f95fc474b075dfe6) Thanks [@yorigcs](https://github.com/yorigcs)! - Published from GitHub Actions through npm trusted publishing, so every package now ships with a
  provenance attestation linking it to the commit and workflow that built it. No code changes.

## 0.1.0

Initial release: the framework-agnostic engine — steps with targets (selectors, refs, anchors, virtual elements, iframes), branching and conditional steps, interactive steps (`advanceOn` events, predicates, signals, delays), step guards (`beforeLeave`, `canNext`), multi-page tours with a router adapter, persistence (`persist()` with versions and migrations; localStorage, sessionStorage and HTTP adapters), analytics, checklists, a tour manager with a priority queue, ambient/blocking layers and display rules (audience, schedule, frequency, snooze, triggers, `explain()`). Extra entries: `@awesome-tour/core/json` (tours as data + JSON Schema) and `@awesome-tour/core/adapters` (PostHog, Segment, Mixpanel, GA4).
