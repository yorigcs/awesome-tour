import {
  anchor,
  byRole,
  createAnchorRegistry,
  createTour,
  Tour,
  useTourAnchor,
  type VirtualElement,
} from '@awesome-tour/react';
import { LoopworkApp, Mixer, parts, Sequencer, Transport, useCreateLoopwork } from '@loopwork';
import { useRef, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

// A registry scoped to this demo, so its anchor names can't clash with other demos on the page.
const anchors = createAnchorRegistry();
const $ = parts('aim');

export function TargetsDemo() {
  const app = useCreateLoopwork();
  const sequencerRef = useRef<HTMLDivElement>(null);
  const mixerRef = useTourAnchor<HTMLDivElement>('mixer', anchors);

  // Not an element: a rect computed every frame. Here, the kick cell under the playhead.
  const [nowPlaying] = useState<VirtualElement>(() => ({
    getBoundingClientRect() {
      const cell = document.querySelector(`#aim [data-cell="0:${app.getState().step}"]`);
      return (cell ?? document.body).getBoundingClientRect();
    },
  }));

  const [tour] = useState(() =>
    createTour({
      id: 'docs-targets',
      anchors,
      steps: [
        {
          id: 'selector',
          target: $('transport'),
          title: 'By selector',
          description: 'A CSS selector string. It pierces open shadow roots too.',
        },
        {
          id: 'role',
          target: byRole('button', { name: 'Export', exact: true, within: '#aim' }),
          title: 'By role and name',
          description: 'The button a user would call “Export”. Survives any markup refactor.',
        },
        {
          id: 'ref',
          target: sequencerRef,
          title: 'By React ref',
          description: 'The ref’s element, resolved when the step starts.',
        },
        {
          id: 'anchor',
          target: anchor('mixer'),
          side: 'left',
          title: 'By anchor',
          description: 'The mixer registers itself as “mixer”. No selector to break.',
        },
        {
          id: 'virtual',
          target: nowPlaying,
          beforeEnter: () => app.play(),
          afterLeave: () => app.stop(),
          title: 'A moving rect',
          description: 'A virtual element: the cell under the playhead, measured every frame.',
        },
        {
          id: 'many',
          target: [$('row-kick'), $('row-clap')],
          title: 'Several targets',
          description: 'An array highlights them together.',
        },
        {
          id: 'missing',
          target: $('mastering'),
          targetTimeout: 800,
          title: 'Not on the page',
          description: 'After targetTimeout the step falls back to the center.',
        },
      ],
    }),
  );

  return (
    <Tour.Root tour={tour}>
      <DemoFrame title="Target types" actions={<StartButton />}>
        <LoopworkApp scope="aim" app={app} layout="custom">
          <Transport />
          <div className="grid min-w-0 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div ref={sequencerRef} className="border-b @3xl:border-r @3xl:border-b-0">
              <Sequencer />
            </div>
            <div ref={mixerRef}>
              <Mixer />
            </div>
          </div>
        </LoopworkApp>
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
