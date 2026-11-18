import {
  analytics,
  createStore,
  createTour,
  Tour,
  type TourAnalyticsEvent,
  useStoreSelector,
} from '@awesome-tour/react';
import { createLoopwork, LoopworkApp, parts } from '@loopwork';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

const $ = parts('bounce-funnel');
const app = createLoopwork({ route: 'mix' });

const log = createStore<{ events: TourAnalyticsEvent[] }>({ events: [] });

const steps = [
  {
    id: 'format',
    target: $('format'),
    title: 'Pick a format',
    description: 'WAV for the master, MP3 to send a sketch to a friend.',
  },
  {
    id: 'bounce',
    target: $('bounce'),
    title: 'Bounce it',
    description: 'Renders the 8-bar loop to a single file.',
    meta: { label: 'bounce-cta' },
  },
  {
    id: 'share',
    title: 'That’s a release',
    description: 'Close this card early next time and watch the funnel drop.',
  },
] as const;

const tour = createTour({
  id: 'docs-analytics',
  version: 3,
  // What the tour is for. Counted even if the user closes the tour first and bounces later.
  goal: { name: 'first-bounce', signal: 'bounced' },
  plugins: [
    // In an app: analytics((e) => posthog.capture(e.type, e))
    analytics((event) => log.setState((s) => ({ events: [event, ...s.events].slice(0, 200) }))),
  ],
  steps,
});

app.on('bounced', () => tour.signal('bounced'));

/** Step-by-step funnel built from the events the plugin emits: views per step, then outcomes. */
function Funnel() {
  const events = useStoreSelector(log, (s) => s.events);
  const starts = events.filter((e) => e.type === 'tour_started').length;
  const views = (id: string) =>
    events.filter((e) => e.type === 'step_viewed' && e.stepId === id).length;
  const outcomes = {
    completed: events.filter((e) => e.type === 'tour_completed').length,
    dismissed: events.filter((e) => e.type === 'tour_dismissed').length,
    goals: events.filter((e) => e.type === 'tour_goal_reached').length,
  };
  const rows = steps.map((step) => ({ id: step.id, label: step.title, count: views(step.id) }));
  return (
    <section aria-label="Tour funnel" className="flex flex-col gap-2">
      {starts === 0 ? (
        <p>
          Run the tour a few times — finish it once, close it early once, bounce once — to fill the
          funnel.
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <li key={row.id} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
                <span className="truncate text-ink">{row.label}</span>
                <span className="h-2.5 bg-paper-2" aria-hidden="true">
                  <span
                    className="block h-full bg-ink transition-[width] duration-200"
                    style={{ width: `${(row.count / starts) * 100}%` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums">
                  {Math.round((row.count / starts) * 100)}%
                </span>
              </li>
            ))}
          </ol>
          <p className="font-mono tabular-nums">
            {starts} started · {outcomes.completed} completed · {outcomes.dismissed} closed early ·{' '}
            {outcomes.goals} bounced (goal)
          </p>
        </>
      )}
    </section>
  );
}

export function AnalyticsDemo() {
  return (
    <Tour.Root tour={tour}>
      <DemoFrame title="Analytics funnel" actions={<StartButton />} footer={<Funnel />}>
        <LoopworkApp scope="bounce-funnel" app={app} layout="routed" />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
