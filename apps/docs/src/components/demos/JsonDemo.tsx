import { fromJSON, type TourJSON } from '@awesome-tour/core/json';
import { createTour, Tour, type TourInstance } from '@awesome-tour/react';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, MockApp, worldButton } from './ui';

const initial: TourJSON = {
  id: 'docs-json',
  steps: [
    {
      id: 'nav',
      target: '#json-nav',
      side: 'right',
      title: 'From JSON',
      description: 'This tour came from the document on the right.',
    },
    {
      id: 'search',
      target: '#json-search',
      title: 'Edit me',
      description: 'Change a title, then start again.',
    },
    {
      id: 'stats',
      target: ['#json-stat-1', '#json-stat-3'],
      title: 'Multiple targets',
      when: 'wide',
    },
  ],
};

// Functions can't live in JSON: they're referenced by name.
const actions = { wide: () => window.innerWidth > 640 };

export function JsonDemo() {
  const [text, setText] = useState(() => JSON.stringify(initial, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [tour, setTour] = useState<TourInstance<any, any>>(() =>
    createTour(fromJSON(initial, { actions })),
  );

  const start = () => {
    try {
      const next = createTour(fromJSON(JSON.parse(text) as TourJSON, { actions }));
      tour.destroy();
      setTour(next);
      setError(null);
      void next.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Tour.Root tour={tour} key={tour.id + text.length}>
      <DemoFrame
        title="Tours as data"
        actions={
          <button type="button" className={worldButton.primary} onClick={start}>
            Build & start
          </button>
        }
        footer={
          error ? (
            <pre role="alert" className="whitespace-pre-wrap font-mono text-dont">
              {error}
            </pre>
          ) : (
            'fromJSON() validates the document and wires the `wide` action into the third step.'
          )
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <MockApp id="json" />
          <textarea
            aria-label="Tour JSON"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-72 w-full resize-y rounded-sm border-2 border-ink bg-paper p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-marker"
          />
        </div>
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
