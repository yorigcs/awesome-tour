import { createTour, Tour, useTour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { Disc3, Drum, Mic } from 'lucide-react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { Button } from '@/components/ui/button';
import { DemoFrame, StartButton } from './ui';

const $ = parts('branches');

interface Data {
  making: 'beats' | 'podcast' | 'dj' | null;
}

const CHOICES = [
  { id: 'beats', label: 'Beats', icon: Drum },
  { id: 'podcast', label: 'A podcast', icon: Mic },
  { id: 'dj', label: 'A DJ set', icon: Disc3 },
] as const;

function MakingPicker() {
  const { setData, next } = useTour<Data>();
  return (
    <div className="mt-1 grid grid-cols-3 gap-2">
      {CHOICES.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant="outline"
          className="h-auto flex-col gap-1 py-2"
          onClick={() => {
            setData({ making: id });
            void next();
          }}
        >
          <Icon />
          {label}
        </Button>
      ))}
    </div>
  );
}

const tour = createTour({
  id: 'docs-branching',
  data: { making: null } as Data,
  steps: [
    {
      id: 'making',
      title: 'What are you making?',
      description: 'We’ll show you the part of Loopwork you need first.',
      content: <MakingPicker />,
      next: (ctx) =>
        (({ beats: 'beat', podcast: 'voice', dj: 'tempo' }) as const)[ctx.data.making ?? 'beats'],
    },
    {
      id: 'beat',
      target: $('sequencer'),
      title: 'Start with the beat',
      description: 'Sixteen steps per bar. Click to add hits.',
      next: 'mixer',
    },
    {
      id: 'voice',
      target: $('lane-vox'),
      title: 'Your voice lives on Vox',
      description: 'It’s muted in this project: unmute it in the mixer before you record.',
      next: 'done',
    },
    {
      id: 'tempo',
      target: $('bpm'),
      title: 'Match your set’s tempo',
      description: 'Type the BPM of the track you’re mixing into.',
      next: 'mixer',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'left',
      // Never shown to podcasters, whatever path leads here.
      when: (ctx) => ctx.data.making !== 'podcast',
      title: 'Balance the channels',
      description: 'Press Back: it walks the path you actually took.',
    },
    {
      id: 'done',
      title: 'You’re set up',
      description: 'Every branch above is a plain function of the tour’s data.',
    },
  ],
});

export function BranchingDemo() {
  return (
    <Tour.Root tour={tour}>
      <DemoFrame title="Branching" actions={<StartButton />}>
        <LoopworkApp scope="branches" />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
