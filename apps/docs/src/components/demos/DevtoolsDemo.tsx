import { TourDevtools } from '@awesome-tour/devtools';
import { createTour, Tour } from '@awesome-tour/react';
import { useState } from 'react';
import { Frame, MockApp, TourCard } from './ui';

const tour = createTour({
  id: 'docs-devtools',
  steps: [
    {
      id: 'welcome',
      title: 'Inspect me',
      description: 'Open the devtools panel (bottom right) while the tour runs.',
    },
    { id: 'nav', target: '#devtools-nav', side: 'right', title: 'Navigation' },
    {
      id: 'beta',
      target: '#devtools-beta',
      title: 'Missing target',
      description: 'Devtools flags targets that are not on the page.',
    },
    {
      id: 'hidden',
      target: '#devtools-new',
      when: () => false,
      title: 'Hidden',
      description: 'when() returns false.',
    },
    { id: 'stats', target: '#devtools-stat-1', title: 'Stats' },
  ],
});

export function DevtoolsDemo() {
  const [show, setShow] = useState(false);
  return (
    <Tour.Root tour={tour}>
      <Frame
        title="Devtools"
        actions={
          <>
            <button
              type="button"
              className="at-button"
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
            >
              {show ? 'Hide devtools' : 'Show devtools'}
            </button>
            <Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>
          </>
        }
        footer="Alt+Shift+T toggles the panel. Hover a step to highlight its target, click to jump to it."
      >
        <MockApp id="devtools" />
      </Frame>
      <TourCard />
      {show && <TourDevtools tours={[tour]} defaultOpen position="bottom-right" />}
    </Tour.Root>
  );
}
