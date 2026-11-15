import { MotionContent, MotionOverlay } from '@awesome-tour/motion';
import { createTour, Tour } from '@awesome-tour/react';
import { useState } from 'react';
import { CardBody, Frame, MockApp } from './ui';

const tour = createTour({
  id: 'docs-motion',
  steps: [
    {
      id: 'nav',
      target: '#motion-nav',
      side: 'right',
      title: 'Springs',
      description: 'The cutout morphs between targets instead of jumping.',
    },
    {
      id: 'search',
      target: '#motion-search',
      title: 'Presets',
      description: 'fade, scale, slide (direction from the placed side) or pop.',
    },
    {
      id: 'stat',
      target: '#motion-stat-3',
      title: 'animateStepChange',
      description: 'The card animates in place between steps.',
    },
    {
      id: 'all',
      target: ['#motion-stat-1', '#motion-stat-3'],
      title: 'Reduced motion',
      description: 'Users who prefer reduced motion get instant transitions.',
    },
  ],
});

const presets = ['slide', 'scale', 'fade', 'pop'] as const;

export function MotionDemo() {
  const [preset, setPreset] = useState<(typeof presets)[number]>('slide');
  return (
    <Tour.Root tour={tour}>
      <Frame
        title="@awesome-tour/motion"
        actions={
          <>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="at-frame__title" style={{ margin: 0 }}>
                preset
              </span>
              <select
                className="at-select"
                value={preset}
                onChange={(e) => setPreset(e.target.value as typeof preset)}
              >
                {presets.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>
          </>
        }
      >
        <MockApp id="motion" />
      </Frame>
      <Tour.Portal>
        <MotionOverlay padding={6} radius={10} />
        <MotionContent
          className="at-card at-card--motion"
          preset={preset}
          sideOffset={12}
          animateStepChange
        >
          <Tour.Arrow className="at-arrow" width={14} height={7} />
          <CardBody />
        </MotionContent>
      </Tour.Portal>
    </Tour.Root>
  );
}
