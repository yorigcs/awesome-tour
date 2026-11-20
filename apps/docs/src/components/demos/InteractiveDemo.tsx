import { createTour, Tour } from '@awesome-tour/react';
import { createLoopwork, emptyPattern, LoopworkApp, parts } from '@loopwork';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

const $ = parts('first-beat');
const app = createLoopwork({ pattern: emptyPattern() });
const kicks = () => app.getState().pattern.kick.filter(Boolean).length;

const tour = createTour({
  id: 'docs-interactive',
  steps: [
    {
      id: 'kick',
      target: $('row-kick'),
      interactive: true,
      title: 'Lay down four kicks',
      description: 'Click any four cells in the kick row. Steps 1, 5, 9 and 13 are a classic.',
      // Advances by itself once the app's state says so.
      advanceOn: { when: () => kicks() >= 4 },
    },
    {
      id: 'bass',
      target: $('knob-bass'),
      interactive: true,
      side: 'left',
      title: 'Bring the bass up to 60%',
      description: 'Focus the knob and press ↑, or drag it upwards.',
      advanceOn: { when: () => app.getState().mixer.bass.level >= 0.6 },
    },
    {
      id: 'play',
      target: $('play'),
      interactive: true,
      title: 'Now play it',
      description: 'The app tells the tour when playback starts.',
      advanceOn: { signal: 'played' },
    },
    {
      id: 'done',
      title: 'That’s your first beat',
      description: 'Every step waited for you to do the thing, not to click Next.',
    },
  ],
});

// Your app reports what happened; the tour listens for the signal.
app.on('play', () => tour.signal('played'));

export function InteractiveDemo() {
  return (
    <Tour.Root tour={tour}>
      <DemoFrame
        title="Interactive steps"
        actions={<StartButton onClick={() => app.reset({ pattern: emptyPattern() })} />}
      >
        <LoopworkApp scope="first-beat" app={app} layout="compact" />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
