import { createTour, type RouterAdapter, Tour } from '@awesome-tour/react';
import { createLoopwork, LoopworkApp, parts, type Route, sampleSlug } from '@loopwork';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

const $ = parts('session');
const app = createLoopwork({ route: 'arrange' });

/** Loopwork's pages, seen through a RouterAdapter — the same shape React Router's adapter has. */
const router: RouterAdapter = {
  getPath: () => `/${app.getState().route}`,
  navigate: (path) => app.navigate(path.slice(1) as Route),
  subscribe: (listener) => app.subscribe(listener),
};

const RHODES = 'Keys rhodes 11';

const tour = createTour({
  id: 'docs-multi-page',
  router,
  steps: [
    {
      id: 'beat',
      route: '/arrange',
      target: $('sequencer'),
      title: 'Sketch on Arrange',
      description: 'The beat is down. Next we pick a sound on another page.',
    },
    {
      id: 'sample',
      route: '/library',
      // The list is virtualized: row 356 doesn't exist until it's scrolled to.
      beforeEnter: () => app.revealSample(RHODES),
      target: $(sampleSlug(RHODES)),
      title: 'A Rhodes loop',
      description: 'The tour opened Library and scrolled 400 samples to this one.',
    },
    {
      id: 'mix',
      route: '/mix',
      target: $('knob-keys'),
      side: 'left',
      title: 'Then balance it on Mix',
      description: 'Press Back: the tour walks you back across pages.',
    },
    {
      id: 'bounce',
      route: '/mix',
      target: $('bounce'),
      title: 'And bounce',
      description: 'Leave this page with the tabs above: the step hides until you return.',
    },
  ],
});

export function MultiPageDemo() {
  return (
    <Tour.Root tour={tour}>
      <DemoFrame
        title="Multi-page"
        actions={<StartButton onClick={() => app.navigate('arrange')} />}
      >
        <LoopworkApp scope="session" app={app} layout="routed" />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
