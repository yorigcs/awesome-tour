import { createTour, Tour } from '@awesome-tour/react';
import { useState } from 'react';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DemoFrame, MockApp, StartButton } from './ui';

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
type Preset = (typeof presets)[number];

export function MotionDemo() {
  const [preset, setPreset] = useState<Preset>('slide');
  return (
    <Tour.Root tour={tour}>
      <DemoFrame
        title="@awesome-tour/motion"
        actions={
          <>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger size="sm" aria-label="Animation preset" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StartButton />
          </>
        }
      >
        <MockApp id="motion" />
      </DemoFrame>
      <TourMotionPopover preset={preset} />
    </Tour.Root>
  );
}
