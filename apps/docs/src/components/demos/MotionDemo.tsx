import { createTour, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { useState } from 'react';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DemoFrame, StartButton } from './ui';

const $ = parts('in-motion');

const tour = createTour({
  id: 'docs-motion',
  steps: [
    {
      id: 'play',
      target: $('play'),
      title: 'Press play',
      description: 'Then go next and watch the spotlight ride the playhead.',
    },
    {
      id: 'playhead',
      target: $('playhead'),
      title: 'Springs follow',
      description: 'The cutout chases a moving target with a spring instead of jumping.',
    },
    {
      id: 'clips',
      target: [$('clip-c1'), $('clip-c3')],
      title: 'Shapes morph',
      description: 'Between steps the cutout morphs from one shape to the next.',
    },
    {
      id: 'reduced',
      target: $('mixer'),
      side: 'left',
      title: 'Reduced motion',
      description: 'With prefers-reduced-motion, every transition is instant.',
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
        <LoopworkApp scope="in-motion" />
      </DemoFrame>
      <TourMotionPopover preset={preset} />
    </Tour.Root>
  );
}
