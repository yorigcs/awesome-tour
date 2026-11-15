import { TourDevtools } from '@awesome-tour/devtools';
import { createTour, Tour } from '@awesome-tour/react';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, MockApp, StartButton, worldButton } from './ui';

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
      <DemoFrame
        title="Devtools"
        actions={
          <>
            <button
              type="button"
              className={worldButton.secondary}
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
            >
              <Wrench />
              {show ? 'Hide devtools' : 'Show devtools'}
            </button>
            <StartButton />
          </>
        }
        footer={
          <>
            <kbd className="rounded border bg-background px-1 font-mono">Alt+Shift+T</kbd> toggles
            the panel. Hover a step to highlight its target, click to jump to it.
          </>
        }
      >
        <MockApp id="devtools" />
      </DemoFrame>
      <TourPopover />
      {show && <TourDevtools tours={[tour]} defaultOpen position="bottom-right" />}
    </Tour.Root>
  );
}
