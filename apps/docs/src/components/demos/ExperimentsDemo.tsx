import {
  analytics,
  createExperiment,
  createStore,
  createTour,
  type Experiment,
  Tour,
  type TourAnalyticsEvent,
  useStoreSelector,
} from '@awesome-tour/react';
import { createLoopwork, emptyPattern, LoopworkApp, parts } from '@loopwork';
import { Shuffle } from 'lucide-react';
import { useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, worldButton } from './ui';

const $ = parts('ab');
const app = createLoopwork({ pattern: emptyPattern() });
const log = createStore<{ events: TourAnalyticsEvent[] }>({ events: [] });
const track = analytics((event) => log.setState((s) => ({ events: [...s.events, event] })));

// Variant A explains the screen; variant B gets the user making a beat right away.
const explain = createTour({
  id: 'first-session-explain',
  goal: { name: 'first-beat', signal: 'played' },
  plugins: [track],
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'Transport',
      description: 'Play, stop, record.',
    },
    {
      id: 'grid',
      target: $('sequencer'),
      title: 'The beat grid',
      description: 'Click cells to add hits.',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'left',
      title: 'Mixer',
      description: 'Set the levels.',
    },
  ],
});

const doIt = createTour({
  id: 'first-session-do',
  goal: { name: 'first-beat', signal: 'played' },
  plugins: [track],
  steps: [
    {
      id: 'kick',
      target: $('row-kick'),
      interactive: true,
      title: 'Click four kicks',
      description: 'Any four cells in the kick row.',
      advanceOn: { when: () => app.getState().pattern.kick.filter(Boolean).length >= 4 },
    },
    {
      id: 'play',
      target: $('play'),
      interactive: true,
      title: 'Now play it',
      description: 'That’s a beat.',
      advanceOn: { signal: 'played' },
    },
  ],
});

app.on('play', () => {
  explain.signal('played');
  doIt.signal('played');
});

const variants = { explain, do: doIt, control: null };
const makeExperiment = (userId: string) =>
  createExperiment({ id: 'first-session-copy', variants, userId });

function Results() {
  const events = useStoreSelector(log, (s) => s.events);
  const rows = (['explain', 'do'] as const).map((variant) => {
    const ofVariant = events.filter((e) => e.variant === variant);
    const started = ofVariant.filter((e) => e.type === 'tour_started').length;
    const converted = ofVariant.filter((e) => e.type === 'tour_goal_reached').length;
    return { variant, started, converted };
  });
  return (
    <table className="w-full max-w-md font-mono tabular-nums">
      <caption className="mb-1 text-left font-sans font-semibold text-ink">
        tour_started → tour_goal_reached, by variant
      </caption>
      <thead>
        <tr className="text-left text-ink">
          <th className="font-semibold">variant</th>
          <th className="font-semibold">started</th>
          <th className="font-semibold">played a beat</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.variant}>
            <td>{r.variant}</td>
            <td>{r.started}</td>
            <td>
              {r.converted}
              {r.started ? ` (${Math.round((r.converted / r.started) * 100)}%)` : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

let users = 1;

export function ExperimentsDemo() {
  const [user, setUser] = useState('user-1');
  const [experiment, setExperiment] = useState<Experiment>(() => makeExperiment('user-1'));
  const variant = experiment.variant();
  const tour = experiment.tour();

  const nextUser = () => {
    explain.close();
    doIt.close();
    app.reset({ pattern: emptyPattern() });
    const id = `user-${++users}`;
    setUser(id);
    setExperiment(makeExperiment(id));
  };

  return (
    <>
      <DemoFrame
        title="A/B test"
        actions={
          <>
            <span className="font-mono text-sm text-ink-2">
              {user} → <strong className="text-ink">{variant}</strong>
            </span>
            <button type="button" className={worldButton.secondary} onClick={nextUser}>
              <Shuffle aria-hidden="true" />
              Next user
            </button>
            <button
              type="button"
              className={worldButton.primary}
              onClick={() => void experiment.start()}
            >
              Start their tour
            </button>
          </>
        }
        footer={<Results />}
      >
        <LoopworkApp scope="ab" app={app} layout="compact" />
      </DemoFrame>
      {tour && (
        <Tour.Root key={tour.id} tour={tour}>
          <TourPopover />
        </Tour.Root>
      )}
    </>
  );
}
