import { createTour, localStorageAdapter, persist, Tour } from '@awesome-tour/react';
import { useEffect, useState } from 'react';
import { Frame, MockApp, TourCard } from './ui';

const adapter = localStorageAdapter({ prefix: 'awesome-tour-docs:' });

/** Each "page load" creates a fresh tour instance, exactly like a real reload would. */
function makeTour() {
  return createTour({
    id: 'persisted',
    version: 1,
    plugins: [persist(adapter)],
    steps: [
      {
        id: 'one',
        target: '#persist-nav',
        side: 'right',
        title: 'Step one',
        description: 'Go to step 2 or 3, then hit "Simulate reload".',
      },
      {
        id: 'two',
        target: '#persist-search',
        title: 'Step two',
        description: 'Progress is saved on every step.',
      },
      {
        id: 'three',
        target: '#persist-new',
        title: 'Step three',
        description: 'Start again after a reload: it resumes here.',
      },
      {
        id: 'four',
        target: '#persist-stat-2',
        title: 'Last step',
        description: 'Finish it, and once: true keeps it from starting again (unless forced).',
      },
    ],
  });
}

function readStored() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('awesome-tour-docs:persisted');
  } catch {
    return null;
  }
}

/** Polls storage so the demo can show what the plugin wrote. */
function useStored() {
  const [value, setValue] = useState(readStored);
  useEffect(() => {
    const id = setInterval(() => setValue(readStored()), 300);
    return () => clearInterval(id);
  }, []);
  return value;
}

export function PersistenceDemo() {
  const [load, setLoad] = useState(0);
  const [tour, setTour] = useState(makeTour);
  const stored = useStored();
  const reload = () => {
    tour.destroy();
    setTour(makeTour());
    setLoad((n) => n + 1);
  };
  return (
    <Tour.Root tour={tour} key={load}>
      <Frame
        title={`Persistence · page load #${load + 1}`}
        actions={
          <>
            {/* restart={false}: resume instead of restarting (the Trigger's default) */}
            <Tour.Trigger restart={false} className="at-button at-button--primary">
              Start tour
            </Tour.Trigger>
            <button
              type="button"
              className="at-button"
              onClick={() => tour.start({ force: true, stepId: 'one' })}
            >
              Force restart
            </button>
            <button type="button" className="at-button" onClick={reload}>
              Simulate reload
            </button>
            <button
              type="button"
              className="at-button at-button--ghost"
              onClick={() => {
                void adapter.remove('persisted');
                reload();
              }}
            >
              Clear storage
            </button>
          </>
        }
        footer={
          <pre className="at-code">
            localStorage["awesome-tour-docs:persisted"] = {stored ?? 'null'}
          </pre>
        }
      >
        <MockApp id="persist" />
      </Frame>
      <TourCard />
    </Tour.Root>
  );
}
