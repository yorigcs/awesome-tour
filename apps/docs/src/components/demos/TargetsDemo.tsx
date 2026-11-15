import { anchor, createAnchorRegistry, createTour, Tour, useTourAnchor } from '@awesome-tour/react';
import { useRef, useState } from 'react';
import { Frame, TourCard } from './ui';

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
      <Frame
        title="Target types"
        actions={<Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>}
      >
        <div className="at-grid">
          <div id="targets-selector" className="at-tile">
            <small>#targets-selector</small>Selector
          </div>
          <div ref={refTarget} className="at-tile">
            <small>ref</small>Ref
          </div>
          <div ref={anchorRef} className="at-tile">
            <small>anchor('billing')</small>Anchor
          </div>
        </div>
        <div className="at-grid" style={{ marginTop: 10 }}>
          {['a', 'b', 'c'].map((k) => (
            <div key={k} id={`targets-${k}`} className="at-tile">
              <small>#targets-{k}</small>
              {k.toUpperCase()}
            </div>
          ))}
        </div>
      </Frame>
      <TourCard />
    </Tour.Root>
  );
}
