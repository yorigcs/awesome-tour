import {
  analytics,
  createStore,
  createTour,
  Tour,
  type TourAnalyticsEvent,
  useStoreSelector,
} from '@awesome-tour/react';
import { Frame, MockApp, TourCard } from './ui';

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

export function AnalyticsDemo() {
  const events = useStoreSelector(log, (s) => s.events);
  return (
    <Tour.Root tour={tour}>
      <Frame
        title="Analytics"
        actions={<Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>}
        footer={
          <ol className="at-log" aria-label="Analytics events">
            {events.length === 0 && (
              <li className="at-log__empty">Start the tour to see events.</li>
            )}
            {events.map((e) => (
              <li key={`${e.timestamp}-${e.type}-${e.stepId}`}>
                <span>{e.type}</span>
                <span>{e.stepId ?? '—'}</span>
                {e.previousStepDurationMs != null && (
                  <span>
                    prev {e.previousStepId} · {Math.round(e.previousStepDurationMs)}ms
                  </span>
                )}
                {e.durationMs != null && <span>total {Math.round(e.durationMs)}ms</span>}
              </li>
            ))}
          </ol>
        }
      >
        <MockApp id="analytics" />
      </Frame>
      <TourCard />
    </Tour.Root>
  );
}
