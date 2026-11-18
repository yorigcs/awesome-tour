import { createTour, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

const $ = parts('first-session');

const tour = createTour({
  id: 'docs-basic',
  steps: [
    {
      id: 'welcome',
      title: 'Your first session',
      description:
        'night-drive is an 8-bar sketch at 92 BPM. Four stops and you know your way around.',
    },
    {
      id: 'transport',
      target: $('transport'),
      title: 'Transport',
      description: 'Play, stop and record. The counter reads bar · beat · step.',
    },
    {
      id: 'arrangement',
      target: $('arrangement'),
      side: 'bottom',
      title: 'Arrangement',
      description: 'One lane per channel. Clips are the parts of your song, laid out bar by bar.',
    },
    {
      id: 'backbone',
      // Several targets in one step: the spotlight covers both rows.
      target: [$('row-kick'), $('row-snare')],
      title: 'Kick and snare',
      description: 'The backbone of the beat. Click a cell to add a hit; each row is one bar.',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'left',
      title: 'Mixer',
      description: 'Set each channel’s level. Drag a knob up, or focus it and use the arrow keys.',
    },
  ],
});

export function BasicDemo() {
  return (
    <Tour.Root tour={tour}>
      <DemoFrame title="Live demo" actions={<StartButton />}>
        <LoopworkApp scope="first-session" />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
