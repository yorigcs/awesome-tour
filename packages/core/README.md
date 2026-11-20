# @awesome-tour/core

The framework-agnostic engine behind [awesome-tour](https://yorigcs.github.io/awesome-tour/): a tour
state machine with branching, conditional and interactive steps, async and lost targets, multi-page
routes, persistence, display rules, a priority queue for many tours, analytics and checklists. No
dependencies, no DOM rendering.

```bash
pnpm add @awesome-tour/core   # React users: install @awesome-tour/react, which re-exports this
```

```ts
import { createTour } from '@awesome-tour/core';

const tour = createTour({
  id: 'first-session',
  steps: [
    { id: 'welcome' },
    { id: 'kick', target: '#row-kick', advanceOn: { when: () => kicks() >= 4 } },
    { id: 'mixer', target: '#mixer', onTargetLost: 'reresolve' },
  ],
});

tour.subscribe(() => render(tour.getState())); // { status, stepId, phase, targets, progress… }
await tour.start();
```

Entry points: `.` (engine), `./json` (tours as validated JSON), `./adapters` (PostHog, Segment,
Mixpanel, GA4), `./schema.json` (JSON Schema).

[Reference](https://yorigcs.github.io/awesome-tour/reference/create-tour/) · MIT
