import {
  createTour,
  type EligibilityReport,
  Tour,
  TourProvider,
  useStoreSelector,
  useTour,
  useTourManager,
} from '@awesome-tour/react';
import { Check, CreditCard, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { AppSurface, DemoFrame, worldButton } from './ui';

interface Data {
  plan: 'free' | 'pro';
}

const tour = createTour({
  id: 'docs-billing-tips',
  modal: false,
  data: { plan: 'free' } as Data,
  steps: [
    {
      id: 'invoices',
      target: '#rules-invoices',
      title: 'Download invoices',
      description: 'Pro plans get PDF invoices every month — right here.',
    },
  ],
  rules: {
    audience: ({ data }) => data.plan === 'pro',
    trigger: { signal: 'billing-opened' },
    frequency: { once: true, maxShows: 2 },
  },
});

function SnoozeButton() {
  const { tour: current } = useTour();
  return (
    <button type="button" className={worldButton.ghost} onClick={() => current.snooze(10_000)}>
      Remind me in 10s
    </button>
  );
}

function Panel() {
  const manager = useTourManager();
  const { setData } = useTour<Data>('docs-billing-tips');
  const data = useStoreSelector(tour, (s) => s.data as Data);
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    const offs = [manager.subscribe(refresh), tour.subscribe(refresh)];
    const timer = setInterval(refresh, 1000); // snooze and cooldown expire with time
    return () => {
      for (const off of offs) off();
      clearInterval(timer);
    };
  }, [manager]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tick` re-evaluates the rules
  useEffect(() => {
    void manager.explain(tour.id).then(setReport);
  }, [manager, tick]);

  return (
    <DemoFrame
      title="Display rules"
      actions={
        <>
          <fieldset className="flex items-center rounded-sm border-2 border-ink">
            <legend className="sr-only">User plan</legend>
            {(['free', 'pro'] as const).map((plan) => (
              <button
                key={plan}
                type="button"
                aria-pressed={data.plan === plan}
                onClick={() => setData({ plan })}
                className={`${worldButton.secondary} h-8 rounded-none border-0 capitalize`}
              >
                {plan}
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            className={worldButton.ghost}
            onClick={() => void manager.resetImpressions()}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
        </>
      }
      footer={
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-ink">
            manager.explain('{tour.id}') →{' '}
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
      <AppSurface className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Billing</p>
          <p className="text-muted-foreground">Plan: {data.plan}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
            onClick={() => manager.signal('billing-opened')}
          >
            <CreditCard className="size-4" aria-hidden="true" />
            Open billing
            <code className="text-xs text-muted-foreground">signal()</code>
          </button>
          <span
            id="rules-invoices"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground"
          >
            Invoices
          </span>
        </div>
      </AppSurface>
    </DemoFrame>
  );
}

export function RulesDemo() {
  return (
    <TourProvider tours={[tour]}>
      <Tour.Root tour={tour}>
        <Panel />
        <TourPopover overlay={false} progress={false}>
          <SnoozeButton />
        </TourPopover>
      </Tour.Root>
    </TourProvider>
  );
}
