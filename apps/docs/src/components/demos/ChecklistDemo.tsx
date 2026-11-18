import { createChecklist, createTour, memoryStorage, Tour } from '@awesome-tour/react';
import { activeCells, connectAudio, createLoopwork, LoopworkApp, parts } from '@loopwork';
import { RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { ChecklistPanel } from '@/components/awesome-tour/checklist';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, worldButton } from './ui';

const $ = parts('first-loop');
const app = createLoopwork({ route: 'arrange' });

const gridTour = createTour({
  id: 'docs-checklist-tour',
  steps: [
    {
      id: 'grid',
      target: $('sequencer'),
      title: 'The beat grid',
      description: 'One bar, sixteen steps. Click a cell to add a hit.',
    },
    {
      id: 'play',
      target: $('play'),
      title: 'Hear it',
      description: 'Finishing this tour checks the first item.',
    },
  ],
});

const checklist = createChecklist({
  id: 'docs-first-loop',
  persistence: memoryStorage(),
  items: [
    { id: 'tour', tour: gridTour, meta: { title: 'Learn the beat grid' } },
    {
      id: 'drums',
      // A predicate over your app's state, re-checked on `checklist.refresh()`.
      when: () => activeCells(app.getState()) >= 20,
      meta: { title: 'Fill the bar', description: '20 hits or more' },
    },
    {
      id: 'bass',
      signal: 'bass-up',
      meta: { title: 'Bring the bass up', description: 'Bass at 60% or more' },
    },
    { id: 'bounce', meta: { title: 'Bounce your first loop' } },
  ],
});

// Your app reports progress: a signal, a refresh, or a manual completion.
app.subscribe(() => checklist.refresh());
app.on('level-changed', () => {
  if (app.getState().mixer.bass.level >= 0.6) checklist.signal('bass-up');
});
app.on('bounced', () => checklist.complete('bounce'));

export function ChecklistDemo() {
  useEffect(() => connectAudio(app), []);
  return (
    <DemoFrame
      title="Onboarding checklist"
      actions={
        <button
          type="button"
          className={worldButton.ghost}
          onClick={() => {
            checklist.reset();
            app.reset({ route: 'arrange' });
          }}
        >
          <RotateCcw aria-hidden="true" />
          Reset
        </button>
      }
    >
      <div className="grid gap-4">
        <ChecklistPanel
          checklist={checklist}
          description="Four steps to your first bounce"
          className="max-w-md"
        />
        <LoopworkApp scope="first-loop" app={app} layout="routed" />
      </div>
      <Tour.Root tour={gridTour}>
        <TourPopover />
      </Tour.Root>
    </DemoFrame>
  );
}
