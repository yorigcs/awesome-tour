import {
  createTour,
  createTourManager,
  type EligibilityReport,
  Tour,
  TourProvider,
  useTour,
} from '@awesome-tour/react';
import { LoopworkApp, parts, useCreateLoopwork } from '@loopwork';
import { Check, FastForward, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, worldButton } from './ui';

const $ = parts('campaign');
const DAY = 86_400_000;

// A fake clock the demo can fast-forward. In your app, leave `clock` out (it's Date.now).
let offset = 0;
const clock = () => Date.now() + offset;
const launch = Date.now();

interface Data {
  plan: 'free' | 'pro';
}

const tour = createTour({
  id: 'docs-stems-campaign',
  modal: false,
  data: { plan: 'free' } as Data,
  steps: [
    {
      id: 'stems',
      target: $('format-stems'),
      title: 'Stems are unlocked',
      description: 'Pro plan: bounce one file per channel and finish the mix anywhere.',
    },
  ],
  rules: {
    audience: ({ data }) => data.plan === 'pro',
    schedule: { startsAt: launch, endsAt: launch + 14 * DAY }, // a two-week campaign
    trigger: { signal: 'mix-opened' },
    frequency: { once: 'completed', maxShows: 3, cooldownMs: DAY },
  },
});

const manager = createTourManager({ tours: [tour], clock, connect: false });

function SnoozeButton() {
  const { tour: current } = useTour();
  return (
    <button type="button" className={worldButton.ghost} onClick={() => current.snooze(2 * DAY)}>
      Remind me in 2 days
    </button>
  );
}

const JUMPS = [
  { label: '+1 h', ms: 3_600_000 },
  { label: '+1 day', ms: DAY },
  { label: '+1 week', ms: 7 * DAY },
];

function Campaign() {
  const app = useCreateLoopwork({ route: 'arrange' });
  const plan = useLoopworkPlan(app);
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [now, setNow] = useState(clock);

  // The app reports what the user does; the manager decides whether the tip may show.
  useEffect(() => {
    const offs = [
      app.on('route-changed', () => {
        if (app.getState().route === 'mix') manager.signal('mix-opened');
      }),
      manager.connect(),
    ];
    return () => {
      for (const off of offs) off();
    };
  }, [app]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the fake clock moving doesn't notify anyone: re-explain when it does
  useEffect(() => {
    const refresh = () => void manager.explain(tour.id).then(setReport);
    refresh();
    const offs = [
      manager.subscribe(refresh),
      tour.subscribe(refresh),
      // Impressions are written after the event that causes them: re-explain once they land.
      tour.on('snooze', () => setTimeout(refresh, 0)),
      tour.on('complete', () => setTimeout(refresh, 0)),
    ];
    return () => {
      for (const off of offs) off();
    };
  }, [now]);

  const jump = (ms: number) => {
    offset += ms;
    setNow(clock());
  };

  return (
    <DemoFrame
      title="Display rules"
      actions={
        <>
          <fieldset className="flex items-center rounded-sm border-2 border-ink">
            <legend className="sr-only">User plan</legend>
            {(['free', 'pro'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={plan === p}
                onClick={() => {
                  app.setPlan(p);
                  tour.setData({ plan: p });
                }}
                className={`${worldButton.secondary} h-8 rounded-none border-0 capitalize`}
              >
                {p}
              </button>
            ))}
          </fieldset>
          <fieldset className="flex items-center rounded-sm border-2 border-ink">
            <legend className="sr-only">Move the clock forward</legend>
            {JUMPS.map((j) => (
              <button
                key={j.label}
                type="button"
                onClick={() => jump(j.ms)}
                className={`${worldButton.secondary} h-8 rounded-none border-0 font-mono`}
              >
                <FastForward aria-hidden="true" />
                {j.label}
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            className={worldButton.ghost}
            onClick={() => {
              offset = 0;
              setNow(clock());
              tour.close();
              void manager.resetImpressions();
              app.reset({ route: 'arrange' });
            }}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
        </>
      }
      footer={
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-ink">
            <span className="font-mono">
              Day {Math.floor((now - launch) / DAY) + 1} of the campaign
            </span>{' '}
            · open the Mix page to trigger it →{' '}
            <span className={report?.eligible ? 'text-ink' : 'text-dont'}>
              {report ? (report.eligible ? 'eligible' : 'blocked') : '…'}
            </span>
          </p>
          <ul aria-label="Rule checks" className="grid gap-1 font-mono sm:grid-cols-2">
            {report?.checks.map((c) => (
              <li key={c.rule} className="flex items-center gap-2">
                {c.ok ? (
                  <Check className="size-3.5 shrink-0" aria-label="passes" />
                ) : (
                  <X className="size-3.5 shrink-0 text-dont" aria-label="fails" />
                )}
                <span className="font-semibold text-ink">{c.rule}</span>
                <span className="truncate">{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <LoopworkApp scope="campaign" app={app} layout="routed" />
    </DemoFrame>
  );
}

function useLoopworkPlan(app: ReturnType<typeof useCreateLoopwork>) {
  const [plan, setPlan] = useState(app.getState().plan);
  useEffect(() => app.subscribe(() => setPlan(app.getState().plan)), [app]);
  return plan;
}

export function RulesDemo() {
  return (
    <TourProvider manager={manager}>
      <Tour.Root tour={tour}>
        <Campaign />
        <TourPopover overlay={false} progress={false}>
          <SnoozeButton />
        </TourPopover>
      </Tour.Root>
    </TourProvider>
  );
}
