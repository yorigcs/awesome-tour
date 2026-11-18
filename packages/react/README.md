# @awesome-tour/react

Unstyled, accessible React primitives for product tours, hints, checklists, announcements and
surveys, in the spirit of Radix. Re-exports [`@awesome-tour/core`](../core).

```bash
pnpm add @awesome-tour/react
```

```tsx
import { createTour, Tour } from '@awesome-tour/react';

const tour = createTour({
  id: 'first-session',
  steps: [
    { id: 'welcome', title: 'Your first session' },
    { id: 'mixer', target: '#mixer', side: 'start', title: 'Mixer' },
  ],
});

<Tour.Root tour={tour}>
  <Tour.Trigger>Take the tour</Tour.Trigger>
  <Tour.Portal>
    <Tour.Overlay />
    <Tour.Content>
      <Tour.Arrow />
      <Tour.Title />
      <Tour.Description />
      <Tour.Prev>Back</Tour.Prev>
      <Tour.Next>Next</Tour.Next>
    </Tour.Content>
  </Tour.Portal>
</Tour.Root>;
```

Focus trap, `inert` background, focus restore, live announcements, RTL-aware keys that leave
sliders and grids alone, and rendering inside modal dialogs come built in. Surfaces
(announcements, surveys, launcher) live in `@awesome-tour/react/surfaces`. Styled versions:
`npx shadcn add @awesome-tour/tour`.

[Docs and live demos](https://yorigcs.github.io/awesome-tour/) · MIT
