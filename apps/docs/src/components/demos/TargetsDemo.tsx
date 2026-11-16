import { anchor, createAnchorRegistry, createTour, Tour, useTourAnchor } from '@awesome-tour/react';
import { useRef, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { AppSurface, DemoFrame, StartButton, Tile } from './ui';

// A registry scoped to this demo, so its anchor names can't clash with other demos on the page.
const anchors = createAnchorRegistry();

export function TargetsDemo() {
  const refTarget = useRef<HTMLDivElement>(null);
  const anchorRef = useTourAnchor<HTMLDivElement>('billing', anchors);
  const [tour] = useState(() =>
    createTour({
      id: 'docs-targets',
      anchors,
      steps: [
        {
          id: 'selector',
          target: '#targets-selector',
          title: 'CSS selector',
          description: "target: '#targets-selector' — also pierces open shadow roots.",
        },
        {
          id: 'ref',
          target: refTarget,
          title: 'React ref',
          description: 'target: ref — resolved when the step starts.',
        },
        {
          id: 'anchor',
          target: anchor('billing'),
          title: 'Anchor',
          description:
            "target: anchor('billing') + useTourAnchor('billing'). No selectors to break.",
        },
        {
          id: 'many',
          target: ['#targets-a', '#targets-c'],
          title: 'Several targets',
          description: 'An array highlights the union of all rects.',
        },
        {
          id: 'missing',
          target: '#does-not-exist',
          targetTimeout: 800,
          onTargetMissing: 'center',
          title: 'Missing target',
          description:
            "Not found within targetTimeout → onTargetMissing: 'center' shows the step centered.",
        },
      ],
    }),
  );

  return (
    <Tour.Root tour={tour}>
      <DemoFrame title="Target types" actions={<StartButton />}>
        <AppSurface className="grid gap-3 sm:grid-cols-3">
          <Tile id="targets-selector" label="#targets-selector">
            Selector
          </Tile>
          <Tile ref={refTarget} label="ref">
            Ref
          </Tile>
          <Tile ref={anchorRef} label="anchor('billing')">
            Anchor
          </Tile>
          {['a', 'b', 'c'].map((k) => (
            <Tile key={k} id={`targets-${k}`} label={`#targets-${k}`}>
              {k.toUpperCase()}
            </Tile>
          ))}
        </AppSurface>
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
