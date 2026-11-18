import {
  createTour,
  Tour,
  TourProvider,
  useStoreSelector,
  useTourManager,
} from '@awesome-tour/react';
import { createAnnouncement } from '@awesome-tour/react/surfaces';
import { LoopworkApp, parts } from '@loopwork';
import { Layers, Play, Zap } from 'lucide-react';
import { AnnouncementModal } from '@/components/awesome-tour/announcement';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, worldButton } from './ui';

const $ = parts('queue');

const firstSession = createTour({
  id: 'first-session',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'Transport',
      description: 'Play, stop, record.',
    },
    {
      id: 'beat',
      target: $('sequencer'),
      title: 'The beat',
      description: 'Sixteen steps per bar.',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'left',
      title: 'Mixer',
      description: 'Levels per channel.',
    },
  ],
});

const whatsNew = createAnnouncement({
  id: 'whats-new',
  variant: 'modal',
  title: 'Loopwork 2.4',
  description: 'Swing per row, wider meters, and a faster bounce.',
});

const saveWarning = createTour({
  id: 'unsaved',
  steps: [
    {
      id: 'save',
      target: $('transport'),
      title: 'Unsaved changes',
      description: 'You’re about to leave night-drive. This interrupts whatever was on screen.',
    },
  ],
});

function Controls() {
  const manager = useTourManager();
  return (
    <>
      <button
        type="button"
        className={worldButton.primary}
        onClick={() => void manager.start('first-session', { force: true })}
      >
        <Play aria-hidden="true" />
        Onboarding
      </button>
      <button
        type="button"
        className={worldButton.secondary}
        onClick={() => void manager.start('whats-new', { force: true, priority: 10 })}
      >
        <Layers aria-hidden="true" />
        What’s new
      </button>
      <button
        type="button"
        className={worldButton.secondary}
        onClick={() => void manager.start('unsaved', { force: true, interrupt: true })}
      >
        <Zap aria-hidden="true" />
        Interrupt
      </button>
    </>
  );
}

function QueueState() {
  const manager = useTourManager();
  const state = useStoreSelector(manager, (s) => s);
  return (
    <p className="font-mono tabular-nums">
      on screen: {state.activeId ?? '—'} · queue: [{state.queue.join(', ')}]
    </p>
  );
}

export function MultipleToursDemo() {
  return (
    <TourProvider tours={[firstSession, whatsNew, saveWarning]}>
      <DemoFrame
        title="Queue and priority"
        actions={<Controls />}
        footer={
          <div className="flex flex-col gap-1">
            <p>Start the onboarding, then ask for “What’s new”: it waits its turn.</p>
            <QueueState />
          </div>
        }
      >
        <LoopworkApp scope="queue" layout="compact" />
      </DemoFrame>
      <Tour.Root tourId="first-session">
        <TourPopover />
      </Tour.Root>
      <Tour.Root tourId="unsaved">
        <TourPopover />
      </Tour.Root>
      <AnnouncementModal announcement={whatsNew} actionLabel="Got it" />
    </TourProvider>
  );
}
