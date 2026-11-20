import {
  createTour,
  frameTarget,
  type ReactStepDefinition,
  Tour,
  type TourInstance,
} from '@awesome-tour/react';
import {
  Arrangement,
  type Loopwork,
  LoopworkApp,
  Mixer,
  parts,
  SampleBrowser,
  Sequencer,
  sampleSlug,
  Transport,
  useCreateLoopwork,
} from '@loopwork';
import { FlaskConical } from 'lucide-react';
import * as React from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, worldButton } from './ui';

const $ = parts('lab');

/* A web component with an open shadow root: Loopwork's peak LED. */
const LED_TAG = 'lw-peak-led';
function defineLed() {
  if (typeof window === 'undefined' || customElements.get(LED_TAG)) return;
  customElements.define(
    LED_TAG,
    class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = `<style>button{all:unset;display:inline-flex;align-items:center;gap:6px;font:500 12px/1 system-ui;padding:6px 8px;border-radius:6px;border:1px solid currentColor;opacity:.8;cursor:pointer}i{width:8px;height:8px;border-radius:50%;background:#e5484d}</style><button class="peak-led" type="button"><i></i>Peak −0.3 dB</button>`;
      }
    },
  );
}

const PLUGIN_HTML = `<!doctype html><html><body style="margin:0;font:13px system-ui;background:#18181b;color:#fafafa;display:grid;place-items:center;height:100vh"><div style="text-align:center"><p style="margin:0 0 8px;opacity:.7">Third-party plugin · sandboxed frame</p><button id="render" style="font:inherit;padding:6px 12px;border-radius:6px;border:0;background:#fafafa;color:#18181b">Render reverb tail</button></div></body></html>`;

interface Scenario {
  id: string;
  label: string;
  breaks: string;
  steps: (ctx: { app: Loopwork; iframe: () => HTMLIFrameElement | null }) => ReactStepDefinition[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'scroll',
    label: 'Sticky header + scroll box',
    breaks: 'Cards hidden under sticky bars, spotlights that stay put while an inner box scrolls.',
    steps: () => [
      {
        id: 'mute',
        target: $('mute-vox'),
        side: 'left',
        title: 'Below the fold',
        description:
          'The app scrolled its own box to bring this up, clear of the sticky transport.',
      },
    ],
  },
  {
    id: 'dialog',
    label: 'Inside a modal dialog',
    breaks: 'Cards rendered behind the dialog, unclickable (inert), or fighting its focus trap.',
    steps: ({ app }) => [
      {
        id: 'drive',
        target: $('fx-drive'),
        beforeEnter: () => app.setFxOpen(true),
        interactive: true,
        title: 'Inside a Radix dialog',
        description:
          'The card renders in the dialog’s top layer. Its buttons work; so does the knob.',
      },
      {
        id: 'tape',
        target: $('fx-tape'),
        afterLeave: () => app.setFxOpen(false),
        title: 'Tab stays in here',
        description: 'Focus moves between the card and the dialog without escaping either.',
      },
    ],
  },
  {
    id: 'transform',
    label: 'Transformed ancestor',
    breaks: 'Fixed positioning measured against the wrong box when a parent has a transform.',
    steps: () => [
      {
        id: 'grid',
        target: $('row-kick'),
        title: 'Tilted, still aligned',
        description: 'The app sits inside a rotated, scaled box. The cutout follows its real rect.',
      },
    ],
  },
  {
    id: 'iframe',
    label: 'Element in an iframe',
    breaks: 'Offsets ignoring the frame’s position, clicks inside the frame never heard.',
    steps: ({ iframe }) => [
      {
        id: 'plugin',
        target: frameTarget(() => iframe(), '#render'),
        advanceOn: { event: 'click' },
        title: 'A button in another document',
        description: 'Click it: the tour hears clicks inside the frame and moves on.',
      },
      { id: 'done', title: 'Heard it', description: 'Same-origin frames work like the page.' },
    ],
  },
  {
    id: 'shadow',
    label: 'Shadow DOM',
    breaks: 'Selectors that can’t see inside web components.',
    steps: () => [
      {
        id: 'led',
        target: '.peak-led',
        title: 'Inside a web component',
        description: '“.peak-led” lives in an open shadow root. Selectors pierce it.',
      },
    ],
  },
  {
    id: 'rtl',
    label: 'Right to left',
    breaks: 'Cards on the wrong side and arrow keys going the wrong way.',
    steps: () => [
      {
        id: 'start',
        target: $('mixer'),
        side: 'start',
        title: 'side: "start"',
        description: 'Start is the right in RTL. Press ← to go forward.',
      },
      {
        id: 'end',
        target: $('sequencer'),
        side: 'end',
        title: 'side: "end"',
        description: 'End is the left. → goes back.',
      },
    ],
  },
  {
    id: 'slow',
    label: 'Slow target',
    breaks: 'Steps that fire before the content they point at has loaded.',
    steps: () => [
      {
        id: 'stems',
        target: $('stems-panel'),
        onTargetMissing: 'wait',
        title: 'Worth the wait',
        description: 'This panel took 1.5 s to load. The step waited for it, hidden.',
      },
    ],
  },
  {
    id: 'virtual',
    label: 'Virtualized list',
    breaks: 'Targets that don’t exist in the DOM until their row is scrolled to.',
    steps: ({ app }) => [
      {
        id: 'sample',
        target: $(sampleSlug('Vox hum 14')),
        beforeEnter: () => app.revealSample('Vox hum 14'),
        title: 'Row 385 of 400',
        description: 'Only ~12 rows exist at a time. beforeEnter scrolled this one into being.',
      },
    ],
  },
  {
    id: 'lost',
    label: 'Target re-rendered mid-step',
    breaks: 'Cards stuck at the top-left corner after the element they pointed at was replaced.',
    steps: () => [
      {
        id: 'clip',
        target: $('lane-bass'),
        title: 'Replaced every second',
        description: 'The arrangement remounts every second. The tour picks up the new element.',
      },
    ],
  },
];

function SlowPanel() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return ready ? (
    <div data-tour="stems-panel" className="m-3 rounded-md border p-3 text-sm">
      <p className="font-medium">Stems</p>
      <p className="text-muted-foreground">drums.wav · bass.wav · keys.wav · vox.wav</p>
    </div>
  ) : (
    <div className="m-3 h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
  );
}

function Remounting() {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setN((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <Arrangement key={n} />;
}

function Stage({ scenario }: { scenario: string }) {
  React.useEffect(defineLed, []);
  switch (scenario) {
    case 'scroll':
      return <LoopworkScene maxHeight={260} />;
    case 'transform':
      return (
        <div style={{ transform: 'rotate(-2deg) scale(0.92)', transformOrigin: 'center' }}>
          <LoopworkScene layout="compact" />
        </div>
      );
    case 'rtl':
      return <LoopworkScene layout="compact" dir="rtl" />;
    case 'shadow':
      return (
        <LoopworkScene layout="custom">
          <Transport />
          <div className="flex items-center gap-2 p-3">
            {React.createElement(LED_TAG)}
            <span className="text-sm text-muted-foreground">Master bus</span>
          </div>
          <Mixer />
        </LoopworkScene>
      );
    case 'slow':
      return (
        <LoopworkScene layout="custom">
          <Transport />
          <SlowPanel />
        </LoopworkScene>
      );
    case 'virtual':
      return (
        <LoopworkScene layout="custom">
          <Transport />
          <SampleBrowser height={220} />
        </LoopworkScene>
      );
    case 'lost':
      return (
        <LoopworkScene layout="custom">
          <Transport />
          <Remounting />
        </LoopworkScene>
      );
    case 'dialog':
      return <LoopworkScene layout="compact" />;
    default:
      return (
        <LoopworkScene layout="custom">
          <Transport />
          <Sequencer />
        </LoopworkScene>
      );
  }
}

const AppContext = React.createContext<Loopwork | null>(null);

function LoopworkScene(props: Omit<React.ComponentProps<typeof LoopworkApp>, 'scope' | 'app'>) {
  const app = React.useContext(AppContext)!;
  return <LoopworkApp {...props} scope="lab" app={app} />;
}

function LostLog({ tour }: { tour: TourInstance<any, any> }) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => tour.on('targetLost', () => setCount((c) => c + 1)), [tour]);
  return count ? (
    <span className="font-mono tabular-nums"> · targetLost × {count}, recovered each time</span>
  ) : null;
}

export function StressLabDemo() {
  const app = useCreateLoopwork();
  const [scenario, setScenario] = React.useState(SCENARIOS[0]!.id);
  const iframe = React.useRef<HTMLIFrameElement>(null);
  const current = SCENARIOS.find((s) => s.id === scenario)!;
  const [tour, setTour] = React.useState<TourInstance<any, any> | null>(null);
  const runs = React.useRef(0);

  const run = (id: string) => {
    const next = SCENARIOS.find((s) => s.id === id)!;
    tour?.destroy();
    app.setFxOpen(false);
    setScenario(id);
    const created = createTour({
      id: `lab-${id}-${++runs.current}`,
      steps: next.steps({ app, iframe: () => iframe.current }),
    });
    setTour(created);
    // Let the scenario's stage render first.
    requestAnimationFrame(() => void created.start());
  };

  return (
    <AppContext.Provider value={app}>
      <DemoFrame
        title="Stress lab"
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-2">
            <FlaskConical aria-hidden="true" className="size-4" />
            Pick a case, the tour runs
          </span>
        }
        footer={
          <span>
            <strong className="text-ink">Where tours usually break: </strong>
            {current.breaks}
            {tour && scenario === 'lost' && <LostLog tour={tour} />}
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">Scenario</legend>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={scenario === s.id}
                data-scenario={s.id}
                onClick={() => run(s.id)}
                className={`${worldButton.secondary} h-auto justify-start py-1.5 text-left`}
              >
                {s.label}
              </button>
            ))}
          </fieldset>
          <div className="flex min-w-0 flex-col gap-3">
            <Stage scenario={scenario} />
            {scenario === 'iframe' && (
              <iframe
                ref={iframe}
                title="Reverb plugin"
                srcDoc={PLUGIN_HTML}
                className="h-28 w-full rounded-lg border"
              />
            )}
          </div>
        </div>
      </DemoFrame>
      {tour && (
        <Tour.Root key={tour.id} tour={tour} dir={scenario === 'rtl' ? 'rtl' : undefined}>
          <TourPopover />
        </Tour.Root>
      )}
    </AppContext.Provider>
  );
}
