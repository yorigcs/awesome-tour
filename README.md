# awesome-tour

Unstyled, accessible, composable primitives for product tours and onboarding in React — in the spirit of Radix.

- **Headless engine** (`@awesome-tour/core`): framework-agnostic state machine with branching, conditional and interactive steps, async targets, multi-page tours, persistence and a plugin system. ~6 kB.
- **React primitives** (`@awesome-tour/react`): compound components with `asChild`, controlled/uncontrolled APIs, data-attributes and CSS variables for styling, full keyboard and screen-reader support. Concurrent-safe (`useSyncExternalStore`), SSR-safe, StrictMode-safe.
- **Motion adapter** (`@awesome-tour/motion`): spotlight that morphs between targets with springs, enter/exit presets.
- **3D adapter** (`@awesome-tour/three`): highlight objects inside a react-three-fiber scene and fly the camera per step.

```bash
pnpm add @awesome-tour/react            # re-exports @awesome-tour/core
pnpm add @awesome-tour/motion motion    # optional
pnpm add @awesome-tour/three            # optional, needs @react-three/fiber + three
```

## Quick start

```tsx
import {
  anchor,
  createTour,
  localStorageAdapter,
  persist,
  Tour,
  useTourAnchor,
} from '@awesome-tour/react';

const onboarding = createTour({
  id: 'onboarding',
  version: 1, // bump to reset saved progress
  plugins: [persist(localStorageAdapter())],
  steps: [
    { id: 'welcome', title: 'Welcome!', description: 'A quick look around.' }, // no target → centered
    { id: 'nav', target: anchor('nav'), side: 'right', title: 'Navigation' }, // anchor, not a selector
    { id: 'create', target: '#create', title: 'Create', advanceOn: { event: 'click' } }, // interactive
    { id: 'admin', target: '#admin', when: (ctx) => ctx.data.isAdmin, title: 'Admin' }, // conditional
    { id: 'reports', route: '/reports', target: '#chart', title: 'Reports' }, // multi-page
  ],
});

function Nav() {
  const ref = useTourAnchor('nav');
  return <nav ref={ref}>…</nav>;
}

export function App() {
  return (
    <Tour.Root tour={onboarding}>
      <Tour.Trigger>Take the tour</Tour.Trigger>
      <Tour.Portal>
        <Tour.Overlay className="overlay" />
        <Tour.Content className="card" side="bottom" sideOffset={12}>
          <Tour.Arrow />
          <Tour.Title />
          <Tour.Description />
          <Tour.StepContent />
          <Tour.Progress />
          <Tour.Prev>Back</Tour.Prev>
          <Tour.Next>Next</Tour.Next>
          <Tour.Close aria-label="Close" />
        </Tour.Content>
      </Tour.Portal>
    </Tour.Root>
  );
}
```

Steps can also be declared in JSX — their children become the step content:

```tsx
<Tour.Root id="inline" defaultOpen>
  <Tour.Step id="one" target="#stats" title="Your numbers">
    <p>Any React content.</p>
  </Tour.Step>
  …
</Tour.Root>;
```

## Core concepts

| Feature           | How                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Targets           | CSS selector (pierces open shadow roots), element, ref, function, `anchor(id)`, virtual element (`getBoundingClientRect`), or an array (union rect).                       |
| Missing targets   | `onTargetMissing: 'center' \| 'wait' \| 'skip' \| 'error'`, `targetTimeout` (default 3000 ms). Targets that appear later are awaited (MutationObserver + anchor registry). |
| Conditional steps | `when(ctx)` (sync or async).                                                                                                                                               |
| Branching         | `next: 'stepId' \| null \| (ctx) => id`. `prev()` walks back through the path actually taken.                                                                              |
| Interactive steps | `advanceOn: { event }`, `{ when }`, `{ signal }` (+ `tour.signal(name)`), optional `to`.                                                                                   |
| Multi-page        | `route` + a `RouterAdapter` (`createBrowserRouter()` or ~10 lines for your router). Navigating away hides the step until the user returns.                                 |
| Lifecycle         | `beforeEnter` / `afterLeave` per step; `start / next / prev / goTo / pause / resume / close / skip / complete / restart`. Superseded transitions are aborted.              |
| Persistence       | `persist(adapter, { resume, once, persistData, sync })`. Adapters: `localStorageAdapter`, `memoryStorage`, or any async backend. Versioned; cross-tab sync.                |
| Plugins           | `beforeStart` (block / resume), `beforeStep` (cancel / redirect), `setup` (subscribe to events — analytics, logging).                                                      |
| Many tours        | `createTourManager` / `<TourProvider tours>`: one tour on screen, others queued by `priority`, `interrupt` to preempt.                                                     |

State is an immutable snapshot (`tour.getState()`, `tour.subscribe()`); events via `tour.on('stepChange' | 'complete' | 'skip' | …)`.

## React API

`Tour.Root` · `Tour.Step` · `Tour.Trigger` · `Tour.Portal` · `Tour.Overlay` · `Tour.Spotlight` · `Tour.Content` · `Tour.Arrow` · `Tour.Title` · `Tour.Description` · `Tour.StepContent` · `Tour.Next` · `Tour.Prev` · `Tour.Close` · `Tour.Skip` · `Tour.Progress` · `Tour.Indicators` · `Tour.Anchor` · `Hotspot.{Root, Beacon, Portal, Content, Close}`

Hooks: `useTour(tour | id)`, `useTourState(selector)`, `useTourSelector(tour, selector)`, `useTourStep()`, `useTourEvent()`, `useTourAnchor(id)`, `useTargetRect()`, `useTourManager()`.

**Styling hooks**

- Data attributes: `data-state="open|closed"`, `data-side`, `data-align`, `data-placement="anchored|center"`, `data-step`, `data-phase`, `data-direction`, `data-target-missing`; targets get `data-tour-target`.
- CSS variables: `--tour-overlay-color`, `--tour-content-transform-origin`, `--tour-content-available-width|height`, `--tour-target-width|height`, `--tour-spotlight-x|y|width|height`, `--tour-progress`.
- Every part accepts `asChild`; anything that animates accepts `forceMount` and waits for CSS exit animations.

**Accessibility**

`role="dialog"` with automatic `aria-labelledby` / `aria-describedby`; modal tours trap focus, make the rest of the page `inert` (targets stay reachable) and restore focus on close; the target gets `aria-describedby` pointing to the step; ←/→ navigate (RTL aware), Escape closes; a polite live region announces "Step n of m" (customizable via `announce`); `prefers-reduced-motion` is respected.

## Motion

```tsx
import { MotionContent, MotionOverlay } from '@awesome-tour/motion';

<Tour.Portal>
  <MotionOverlay padding={6} radius={10} /> {/* cutout springs between targets */}
  <MotionContent preset="slide" animateStepChange>
    …
  </MotionContent>
</Tour.Portal>;
```

Presets: `fade`, `scale`, `slide` (direction from the placed side), `pop`, or a factory `(side) => ({ initial, animate, exit, transition })`. Also `MotionSpotlight` and `useSpotlightSprings` for custom renderers.

## react-three-fiber

```tsx
import { TourTarget3D, useTourCamera } from '@awesome-tour/three';

<Canvas>
  <TourTarget3D name="engine">
    <Engine />
  </TourTarget3D>
  <CameraRig /> {/* useTourCamera({ engine: { position: [3, 2, 4], lookAt: [0, 0, 0] } }) */}
</Canvas>;
// step: { id: 'engine', target: anchor('engine') }
```

The object's bounding box is projected to the screen on demand, so the DOM overlay and popover follow it as the camera moves.

## Development

```bash
pnpm install
pnpm dev         # playground at http://localhost:5173 (uses package sources)
pnpm test        # unit tests (Vitest + Testing Library + axe)
pnpm e2e         # Playwright against the built playground
pnpm typecheck && pnpm lint && pnpm build && pnpm size
pnpm changeset   # describe a change for the next release
```

## Roadmap

Router adapters (React Router, Next.js App Router, TanStack Router) · analytics plugin · onboarding **Checklist** primitive (progress across tours) · devtools panel · documentation site.
