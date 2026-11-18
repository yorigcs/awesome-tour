import { TourDevtools } from '@awesome-tour/devtools';
import { createTour, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton, worldButton } from './ui';

const $ = parts('inspect');

const tour = createTour({
  id: 'docs-devtools',
  data: { plan: 'free' },
  steps: [
    {
      id: 'welcome',
      title: 'What’s new in 2.4',
      description: 'Open the devtools panel (bottom right) while this runs.',
    },
    {
      id: 'sequencer',
      target: $('sequencer'),
      title: 'Swing per row',
      description: 'Each drum row now has its own swing.',
    },
    {
      // Not shipped to this build yet: devtools flags the missing target.
      id: 'stems',
      target: $('stems-export'),
      title: 'Stems export',
      description: 'One file per channel.',
    },
    {
      // Pro only: `when` hides it on the free plan, and devtools says so.
      id: 'mastering',
      target: $('export'),
      when: (ctx) => ctx.data.plan === 'pro',
      title: 'Mastering presets',
      description: 'Loudness targets for every platform.',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'left',
      title: 'Wider meters',
      description: 'Easier to read while you mix.',
    },
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
        <LoopworkApp scope="inspect" />
      </DemoFrame>
      <TourPopover />
      {show && <TourDevtools tours={[tour]} defaultOpen position="bottom-right" />}
    </Tour.Root>
  );
}
