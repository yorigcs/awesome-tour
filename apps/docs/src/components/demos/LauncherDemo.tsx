import { createTour, Tour, TourProvider } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { HelpLauncher } from '@/components/awesome-tour/launcher';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame } from './ui';

const $ = parts('help');

const firstSession = createTour({
  id: 'docs-launcher-first-session',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'Transport',
      description: 'Play, stop and record. The counter reads bar · beat · step.',
    },
    {
      id: 'arrangement',
      target: $('arrangement'),
      title: 'Arrangement',
      description: 'One lane per channel; clips are the parts of your song.',
    },
  ],
});

const effects = createTour({
  id: 'docs-launcher-effects',
  steps: [
    {
      id: 'slot',
      target: $('fx-slot'),
      side: 'left',
      title: 'Drum bus effects',
      description: 'Drive and tape saturation, on every drum hit before the mixer.',
    },
  ],
});

export function LauncherDemo() {
  return (
    <TourProvider tours={[firstSession, effects]}>
      <DemoFrame
        title="Help launcher"
        actions={
          <HelpLauncher
            side="bottom"
            className="relative right-auto bottom-auto size-9 shadow-none"
            tours={[
              {
                tour: firstSession.id,
                title: 'Your first session',
                description: 'Transport and arrangement.',
              },
              { tour: effects.id, title: 'Shaping drums', description: 'The drum bus effects.' },
            ]}
            links={[{ title: 'Keyboard shortcuts', href: '#' }]}
          />
        }
      >
        <LoopworkApp scope="help" />
      </DemoFrame>
      <Tour.Root tour={firstSession}>
        <TourPopover />
      </Tour.Root>
      <Tour.Root tour={effects}>
        <TourPopover />
      </Tour.Root>
    </TourProvider>
  );
}
