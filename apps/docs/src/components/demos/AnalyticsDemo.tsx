import {
  analytics,
  createStore,
  createTour,
  Tour,
  type TourAnalyticsEvent,
  useStoreSelector,
} from '@awesome-tour/react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { Badge } from '@/components/ui/badge';
import { DemoFrame, MockApp, StartButton } from './ui';

const log = createStore<{ events: TourAnalyticsEvent[] }>({ events: [] });

const tour = createTour({
  id: 'docs-analytics',
  version: 3,
  plugins: [
    // In an app: analytics((e) => posthog.capture(e.type, e))
    analytics((event) => log.setState((s) => ({ events: [event, ...s.events].slice(0, 12) }))),
  ],
  steps: [
    {
      id: 'welcome',
      title: 'Analytics',
      description: 'Every interaction becomes a flat event — watch the log.',
    },
    {
      id: 'search',
      target: '#analytics-search',
      title: 'step_viewed',
      description: 'Includes the previous step and how long it was on screen.',
    },
    {
      id: 'new',
      target: '#analytics-new',
      title: 'Finish or close',
      description: 'Ends with tour_completed, tour_skipped or tour_dismissed.',
      meta: { label: 'create-cta' },
    },
  ],
});

function EventLog() {
  const events = useStoreSelector(log, (s) => s.events);
  return (
    <ol
      aria-label="Analytics events"
      className="flex max-h-48 flex-col gap-1 overflow-y-auto font-mono"
    >
      {events.length === 0 && <li>Start the tour to see events.</li>}
      {events.map((e) => (
        <li
          key={`${e.timestamp}-${e.type}-${e.stepId}`}
          className="flex flex-wrap items-center gap-2"
        >
          <Badge variant="secondary" className="font-mono">
            {e.type}
          </Badge>
          <span className="text-foreground">{e.stepId ?? '—'}</span>
          {e.previousStepDurationMs != null && (
            <span>
              prev {e.previousStepId} · {Math.round(e.previousStepDurationMs)}ms
            </span>
          )}
          {e.durationMs != null && <span>total {Math.round(e.durationMs)}ms</span>}
        </li>
      ))}
    </ol>
  );
}

export function AnalyticsDemo() {
  return (
    <Tour.Root tour={tour}>
      <DemoFrame title="Analytics" actions={<StartButton />} footer={<EventLog />}>
        <MockApp id="analytics" />
      </DemoFrame>
      <TourPopover />
    </Tour.Root>
  );
}
