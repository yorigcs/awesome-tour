import { createTour, createTourManager, Tour, TourProvider } from '@awesome-tour/react';
import { ExportPanel, LoopworkApp, Mixer, parts, Transport } from '@loopwork';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, worldButton } from './ui';

const $ = parts('stuck');

// Each tip waits for a sign that the user is stuck, then shows once.
const lingering = createTour({
  id: 'tip-mixer',
  modal: false,
  scroll: false,
  rules: { trigger: { dwell: { target: $('mixer'), ms: 1500 } }, frequency: { maxShows: 1 } },
  steps: [
    {
      id: 'tip',
      target: $('mixer'),
      side: 'start',
      title: 'Looking for the levels?',
      description: 'Drag a knob up, or focus it and press ↑. You lingered here, so here’s the tip.',
    },
  ],
});

const frustrated = createTour({
  id: 'tip-stems',
  modal: false,
  scroll: false,
  rules: {
    trigger: { rageClick: { target: $('format-stems'), clicks: 3 } },
    frequency: { maxShows: 1 },
  },
  steps: [
    {
      id: 'tip',
      target: $('format-stems'),
      title: 'Stems are a Pro feature',
      description: 'Three clicks on a locked option: you clearly want it. WAV is free meanwhile.',
    },
  ],
});

const idle = createTour({
  id: 'tip-idle',
  modal: false,
  scroll: false,
  rules: { trigger: { idle: 8000 }, frequency: { maxShows: 1 } },
  steps: [
    {
      id: 'tip',
      target: $('play'),
      title: 'Need a hand?',
      description: 'Nothing happened for 8 seconds. Press play to hear what’s there.',
    },
  ],
});

const tips = [lingering, frustrated, idle];
const manager = createTourManager({ tours: tips, connect: false });

function Log() {
  const [fired, setFired] = useState<string[]>([]);
  useEffect(() => {
    const offs = tips.map((tip) => tip.on('start', () => setFired((f) => [...f, tip.id])));
    return () => {
      for (const off of offs) off();
    };
  }, []);
  return (
    <span className="font-mono">
      {fired.length
        ? `started: ${fired.join(', ')}`
        : 'Hover the mixer, triple-click Stems, or wait 8 s.'}
    </span>
  );
}

export function BehaviorDemo() {
  // The triggers listen to the whole document: arm them only while the demo is on screen, so
  // reading the docs above it doesn't count as being idle.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return manager.connect();
    let disconnect: (() => void) | null = null;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !disconnect) disconnect = manager.connect();
      else if (!entry?.isIntersecting && disconnect) {
        disconnect();
        disconnect = null;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      disconnect?.();
    };
  }, []);
  return (
    <TourProvider manager={manager}>
      <div ref={ref}>
        <DemoFrame
          title="Help when they're stuck"
          actions={
            <button
              type="button"
              className={worldButton.ghost}
              onClick={() => {
                for (const tip of tips) tip.close();
                void manager.resetImpressions();
              }}
            >
              <RotateCcw aria-hidden="true" />
              Reset
            </button>
          }
          footer={<Log />}
        >
          <LoopworkApp scope="stuck" layout="custom">
            <Transport />
            <div className="grid min-w-0 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <Mixer className="border-b @3xl:border-r @3xl:border-b-0" />
              <ExportPanel />
            </div>
          </LoopworkApp>
        </DemoFrame>
      </div>
      {tips.map((tip) => (
        <Tour.Root key={tip.id} tour={tip}>
          <TourPopover overlay={false} progress={false} />
        </Tour.Root>
      ))}
    </TourProvider>
  );
}
