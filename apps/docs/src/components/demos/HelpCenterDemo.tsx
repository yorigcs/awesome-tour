import {
  createChecklist,
  createFeed,
  createTour,
  memoryStorage,
  Tour,
  TourProvider,
} from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { HelpCenter } from '@/components/awesome-tour/help-center';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame } from './ui';

const $ = parts('help-desk');

const swingTour = createTour({
  id: 'docs-help-swing',
  steps: [
    {
      id: 'grid',
      target: $('row-hat'),
      title: 'Swing per row',
      description: 'Give the hats their own shuffle while the kick stays straight.',
    },
  ],
});

const firstSession = createTour({
  id: 'docs-help-first-session',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'Transport',
      description: 'Play, stop, record.',
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

// Release notes (from your CMS, say). Read state is remembered with `persistence`.
const news = createFeed({
  id: 'docs-loopwork-news',
  persistence: memoryStorage(),
  items: [
    {
      id: '2.4-swing',
      title: 'Swing per row',
      description: 'Shuffle the hats, keep the kick straight.',
      date: '2026-11-12',
      tour: swingTour.id,
    },
    {
      id: '2.4-meters',
      title: 'Wider meters',
      description: 'Easier to read while you mix.',
      date: '2026-11-12',
    },
    {
      id: '2.3-stems',
      title: 'Stems export',
      description: 'One file per channel, on Pro.',
      date: '2026-10-28',
      href: '#',
    },
  ],
});

const setup = createChecklist({
  id: 'docs-help-setup',
  persistence: memoryStorage(),
  items: [
    { id: 'tour', tour: firstSession, meta: { title: 'Take the studio tour' } },
    { id: 'sound', meta: { title: 'Turn the preview audio on' } },
  ],
});

export function HelpCenterDemo() {
  return (
    <TourProvider tours={[swingTour, firstSession]}>
      <DemoFrame
        title="Help center"
        actions={
          <HelpCenter
            side="bottom"
            className="relative right-auto bottom-auto size-9 shadow-none"
            feed={news}
            checklist={setup}
            tours={[
              {
                tour: firstSession.id,
                title: 'Studio tour',
                description: 'A minute, start to finish.',
              },
            ]}
            links={[{ title: 'Keyboard shortcuts', href: '#' }]}
          />
        }
        footer="The red badge counts unread news; it clears once you've opened the panel and closed it."
      >
        <LoopworkApp scope="help-desk" layout="compact" />
      </DemoFrame>
      <Tour.Root tour={swingTour}>
        <TourPopover />
      </Tour.Root>
      <Tour.Root tour={firstSession}>
        <TourPopover />
      </Tour.Root>
    </TourProvider>
  );
}
