import { createTour, Tour } from '@awesome-tour/react';
import { useState } from 'react';
import { Frame, TourCard } from './ui';

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
      <Frame
        title="Interactive steps"
        actions={
          <Tour.Trigger
            className="at-button at-button--primary"
            onClick={() => {
              setCreated(false);
              setSaved(false);
              setName('');
            }}
          >
            Start tour
          </Tour.Trigger>
        }
      >
        <div className="at-row">
          <button
            id="interactive-new"
            type="button"
            className="at-button"
            onClick={() => setCreated(true)}
          >
            New project
          </button>
          <input
            id="interactive-name"
            className="at-input"
            placeholder="Project name"
            aria-label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!created}
          />
          <button
            id="interactive-save"
            type="button"
            className="at-button at-button--primary"
            onClick={() => {
              setSaved(true);
              tour.signal('saved');
            }}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </Frame>
      <TourCard />
    </Tour.Root>
  );
}
