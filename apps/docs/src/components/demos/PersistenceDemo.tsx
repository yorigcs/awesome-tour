import { createTour, localStorageAdapter, persist, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts, useCreateLoopwork } from '@loopwork';
import { RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton, worldButton } from './ui';

const adapter = localStorageAdapter({ prefix: 'awesome-tour-docs:' });
const $ = parts('saved-session');

/** Each "page load" creates a fresh tour instance, exactly like a real reload would. */
function makeTour() {
  return createTour({
    id: 'persisted',
    version: 1,
    plugins: [persist(adapter)],
    steps: [
      {
        id: 'kick',
        target: $('row-kick'),
        title: 'Lay down the kick',
        description: 'Go a step or two in, then hit “Simulate reload”.',
      },
      {
        id: 'snare',
        target: $('row-snare'),
        title: 'Snare on 2 and 4',
        description: 'Your place is saved on every step.',
      },
      {
        id: 'hat',
        target: $('row-hat'),
        title: 'Hats keep time',
        description: 'Start again after a reload: it picks up right here.',
      },
      {
        id: 'mix',
        target: $('mixer'),
        side: 'left',
        title: 'Balance it',
        description: 'Finish it, and `once` keeps it from starting again unless forced.',
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
  // The project outlives the simulated reloads (your app keeps its own data); the tour is rebuilt.
  const app = useCreateLoopwork();
  const reload = () => {
    tour.destroy();
    setTour(makeTour());
    setLoad((n) => n + 1);
  };
  return (
    <Tour.Root tour={tour} key={load}>
      <DemoFrame
        title={`Persistence · page load #${load + 1}`}
        actions={
          <>
            {/* restart={false}: resume instead of restarting (the Trigger's default) */}
            <StartButton restart={false} />
            <button
              type="button"
              className={worldButton.secondary}
              onClick={() => tour.start({ force: true, stepId: 'kick' })}
            >
              <RotateCcw />
              Force restart
            </button>
            <button type="button" className={worldButton.secondary} onClick={reload}>
              <RefreshCw />
              Simulate reload
            </button>
            <button
              type="button"
              className={worldButton.ghost}
              onClick={() => {
                void adapter.remove('persisted');
                reload();
              }}
            >
              <Trash2 />
              Clear storage
            </button>
          </>
        }
        footer={
          <pre className="overflow-x-auto font-mono whitespace-pre-wrap">
            localStorage["awesome-tour-docs:persisted"] = {stored ?? 'null'}
          </pre>
        }
      >
        <LoopworkApp scope="saved-session" layout="compact" app={app} />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
