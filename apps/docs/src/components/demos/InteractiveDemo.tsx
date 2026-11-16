import { createTour, Tour } from '@awesome-tour/react';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppSurface, DemoFrame, StartButton } from './ui';

const tour = createTour({
  id: 'docs-interactive',
  steps: [
    {
      id: 'click',
      target: '#interactive-new',
      title: 'Click the button',
      description: "advanceOn: { event: 'click' } — the tour continues when you click it.",
      advanceOn: { event: 'click' },
    },
    {
      id: 'type',
      target: '#interactive-name',
      interactive: true,
      title: 'Name your project',
      description: 'advanceOn.when — continues once the name has 3+ characters.',
      advanceOn: {
        when: () =>
          (document.querySelector<HTMLInputElement>('#interactive-name')?.value.length ?? 0) >= 3,
      },
    },
    {
      id: 'signal',
      target: '#interactive-save',
      interactive: true,
      title: 'Save it',
      description: "advanceOn: { signal: 'saved' } — the app calls tour.signal('saved').",
      advanceOn: { signal: 'saved' },
    },
    { id: 'done', title: 'Done!', description: 'Interactive steps teach by doing.' },
  ],
});

export function InteractiveDemo() {
  const [created, setCreated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  return (
    <Tour.Root tour={tour}>
      <DemoFrame
        title="Interactive steps"
        actions={
          <StartButton
            onClick={() => {
              setCreated(false);
              setSaved(false);
              setName('');
            }}
          />
        }
      >
        <AppSurface className="flex flex-wrap items-center gap-2">
          <Button id="interactive-new" variant="outline" onClick={() => setCreated(true)}>
            <Plus />
            New project
          </Button>
          <Input
            id="interactive-name"
            placeholder="Project name"
            aria-label="Project name"
            className="w-48"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!created}
          />
          <Button
            id="interactive-save"
            onClick={() => {
              setSaved(true);
              tour.signal('saved');
            }}
          >
            {saved ? (
              <>
                <Check /> Saved
              </>
            ) : (
              'Save'
            )}
          </Button>
        </AppSurface>
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
