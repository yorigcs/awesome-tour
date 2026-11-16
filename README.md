# awesome-tour

Unstyled, accessible, composable primitives for product tours and onboarding in React — in the spirit of Radix.

📖 **[Documentation & live demos](https://yorigcs.github.io/awesome-tour/)**

- **Headless engine** (`@awesome-tour/core`): framework-agnostic state machine with branching, conditional and interactive steps, async targets, multi-page tours, persistence and a plugin system. ~6 kB.
- **React primitives** (`@awesome-tour/react`): compound components with `asChild`, controlled/uncontrolled APIs, data-attributes and CSS variables for styling, full keyboard and screen-reader support. Concurrent-safe (`useSyncExternalStore`), SSR-safe, StrictMode-safe.
- **Motion adapter** (`@awesome-tour/motion`): spotlight that morphs between targets with springs, enter/exit presets.
- **3D adapter** (`@awesome-tour/three`): highlight objects inside a react-three-fiber scene and fly the camera per step.
- **Router adapters** (`@awesome-tour/router`): React Router, Next.js App Router and TanStack Router for multi-page tours.
- **Devtools** (`@awesome-tour/devtools`): inspect tours, jump between steps, check target health, watch events.
- **Onboarding checklist** and **analytics** built in: track progress across tours, send flat events to any analytics tool.

```bash
pnpm add @awesome-tour/react            # re-exports @awesome-tour/core
pnpm add @awesome-tour/motion motion    # optional
pnpm add @awesome-tour/three            # optional, needs @react-three/fiber + three
pnpm add @awesome-tour/router           # optional, router adapters
pnpm add -D @awesome-tour/devtools      # optional, development panel
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

| Feature           | How                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Targets           | CSS selector (pierces open shadow roots), element, ref, function, `anchor(id)`, virtual element (`getBoundingClientRect`), or an array (union rect).                                                    |
| Missing targets   | `onTargetMissing: 'center' \| 'wait' \| 'skip' \| 'error'`, `targetTimeout` (default 3000 ms). Targets that appear later are awaited (MutationObserver + anchor registry).                              |
| Conditional steps | `when(ctx)` (sync or async).                                                                                                                                                                            |
| Branching         | `next: 'stepId' \| null \| (ctx) => id`. `prev()` walks back through the path actually taken.                                                                                                           |
| Interactive steps | `advanceOn: { event }`, `{ when }`, `{ signal }` (+ `tour.signal(name)`), optional `to`.                                                                                                                |
| Multi-page        | `route` + a `RouterAdapter` (`createBrowserRouter()` or ~10 lines for your router). Navigating away hides the step until the user returns.                                                              |
| Lifecycle         | `beforeEnter` / `afterLeave` per step; `start / next / prev / goTo / pause / resume / close / skip / complete / restart`. Superseded transitions are aborted.                                           |
| Persistence       | `persist(adapter, { resume, once, persistData, sync })`. Adapters: `localStorageAdapter`, `memoryStorage`, or any async backend. Versioned; cross-tab sync.                                             |
| Plugins           | `beforeStart` (block / resume), `beforeStep` (cancel / redirect), `setup` (subscribe to events).                                                                                                        |
| Analytics         | `analytics(track, { includeData, filter })` emits `tour_started`, `step_viewed` (with time on the previous step), `tour_completed` / `tour_skipped` / `tour_dismissed`, `target_missing`, `tour_error`. |
| Many tours        | `createTourManager` / `<TourProvider tours>`: one tour on screen, others queued by `priority`, `interrupt` to preempt.                                                                                  |

State is an immutable snapshot (`tour.getState()`, `tour.subscribe()`); events via `tour.on('stepChange' | 'complete' | 'skip' | …)`.

## React API

`Tour.Root` · `Tour.Step` · `Tour.Trigger` · `Tour.Portal` · `Tour.Overlay` · `Tour.Spotlight` · `Tour.Content` · `Tour.Arrow` · `Tour.Title` · `Tour.Description` · `Tour.StepContent` · `Tour.Next` · `Tour.Prev` · `Tour.Close` · `Tour.Skip` · `Tour.Progress` · `Tour.Indicators` · `Tour.Anchor` · `Hotspot.{Root, Beacon, Portal, Content, Close}`

`Checklist.{Root, Progress, List, Item, ItemTrigger, ItemIndicator, ItemSkip, Dismiss}`

Hooks: `useTour(tour | id)`, `useTourState(selector)`, `useTourSelector(tour, selector)`, `useTourStep()`, `useTourEvent()`, `useTourAnchor(id)`, `useTargetRect()`, `useTourManager()`, `useChecklist()`, `useChecklistItem()`, `useRouterAdapter()`, `useStoreSelector()`.

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

## Routers

```tsx
import { useReactRouterAdapter } from '@awesome-tour/router/react-router';
// or: useNextRouterAdapter from '@awesome-tour/router/next'
// or: useTanStackRouterAdapter from '@awesome-tour/router/tanstack-router'

function Providers({ children }) {
  const router = useReactRouterAdapter(); // must be rendered inside your router
  return (
    <TourProvider tours={[onboarding]} router={router}>
      {children}
    </TourProvider>
  );
}
```

Steps with `route: '/projects/:id'` navigate there first; `:params` and `*` match by default. For any other router: `useRouterAdapter({ pathname, navigate })` from `@awesome-tour/react`.

## Onboarding checklist

```tsx
import { Checklist, createChecklist, localStorageAdapter } from '@awesome-tour/react';

const gettingStarted = createChecklist({
  id: 'getting-started',
  persistence: localStorageAdapter({ prefix: 'checklist:' }),
  onComplete: () => confetti(),
  items: [
    { id: 'tour', tour: 'onboarding', meta: { title: 'Take the tour' } }, // completed by a tour
    { id: 'invite', signal: 'invited', meta: { title: 'Invite a teammate' } }, // gettingStarted.signal('invited')
    { id: 'profile', when: () => user.hasAvatar, meta: { title: 'Add a photo' } },
  ],
});

<Checklist.Root checklist={gettingStarted}>
  <Checklist.Progress />
  <Checklist.List>
    {gettingStarted.getItems().map((item) => (
      <Checklist.Item key={item.id} value={item.id}>
        <Checklist.ItemIndicator>✓</Checklist.ItemIndicator>
        <Checklist.ItemTrigger>{item.meta.title}</Checklist.ItemTrigger>{' '}
        {/* starts the linked tour */}
      </Checklist.Item>
    ))}
  </Checklist.List>
  <Checklist.Dismiss aria-label="Dismiss checklist">✕</Checklist.Dismiss>
</Checklist.Root>;
```

Inside a `TourProvider`, items can reference tours by id, including tours mounted later. `Checklist.Progress` is a `progressbar`, and each trigger is described by its status ("Completed" / "Not completed").

## Devtools

```tsx
import { TourDevtools } from '@awesome-tour/devtools';

<TourProvider tours={[onboarding]}>
  <App />
  {import.meta.env.DEV && <TourDevtools checklists={[gettingStarted]} />}
</TourProvider>;
```

A floating panel (toggle with <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd>), rendered in a shadow root so it never clashes with your styles. It lists every registered tour with its status and progress, shows each step's target health (found / missing / on another route / hidden by `when`), highlights a step's target on hover, jumps to any step on click, drives the tour (restart, next, pause, complete…), and shows the tour's `data`, a live event timeline, and checklists (click an item to toggle it).

It stays usable during modal tours thanks to `data-tour-keep`: any element with that attribute (devtools, toasts, chat widgets) is never made inert, and tour keyboard shortcuts ignore events coming from it.

## Development

```bash
pnpm install
pnpm dev         # playground at http://localhost:5173 (uses package sources)
pnpm docs:dev    # docs site at http://localhost:4321/awesome-tour/
pnpm test        # unit tests (Vitest + Testing Library + axe)
pnpm e2e         # Playwright against the built playground
pnpm typecheck && pnpm lint && pnpm build && pnpm size
pnpm changeset   # describe a change for the next release
pnpm check:packages  # publint + Are The Types Wrong on the built packages
```

Releases are automated with Changesets and npm trusted publishing — see [RELEASING.md](./RELEASING.md).
