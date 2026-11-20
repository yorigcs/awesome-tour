import {
  anchor,
  byRole,
  byTour,
  createTour,
  type TargetInput,
  Tour,
  type TourInstance,
  type TourManager,
} from '@awesome-tour/react';
import * as React from 'react';
import type { PickedLocator, PickedTarget } from './picker';

/**
 * The tour recorder: click through your app, get a tour. Each recorded step keeps the most stable
 * target the picker found, the page it was on, and the text you type; play it right there, then
 * copy it as JSON (for a CMS) or as code.
 */

export interface RecordedStep {
  id: string;
  /** `null` for a centered step. */
  locator: PickedLocator | null;
  /** How the target reads in code (`byRole('button', { name: 'Export' })`). */
  code: string | null;
  quality: PickedTarget['quality'] | null;
  route: string;
  title: string;
  description: string;
  side: '' | 'top' | 'right' | 'bottom' | 'left' | 'start' | 'end';
}

const STORAGE = 'awesome-tour-devtools:recording';

function load(): RecordedStep[] {
  try {
    const raw = window.localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as RecordedStep[]) : [];
  } catch {
    return [];
  }
}

/** Recorded steps, kept in localStorage so a full page load (MPA navigation) doesn't lose them. */
export function useRecording() {
  const [steps, setSteps] = React.useState<RecordedStep[]>(() =>
    typeof window === 'undefined' ? [] : load(),
  );
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE, JSON.stringify(steps));
    } catch {
      /* private mode */
    }
  }, [steps]);
  const nextId = (list: RecordedStep[]) => {
    let n = list.length + 1;
    while (list.some((s) => s.id === `step-${n}`)) n++;
    return `step-${n}`;
  };
  const route = () => window.location.pathname;
  return {
    steps,
    addTarget(picked: PickedTarget) {
      setSteps((list) => [
        ...list,
        {
          id: nextId(list),
          locator: picked.locator ?? picked.target,
          code: picked.code ? picked.target : `'${picked.target.replace(/'/g, "\\'")}'`,
          quality: picked.quality,
          route: route(),
          title: '',
          description: '',
          side: '',
        },
      ]);
    },
    addCentered() {
      setSteps((list) => [
        ...list,
        {
          id: nextId(list),
          locator: null,
          code: null,
          quality: null,
          route: route(),
          title: '',
          description: '',
          side: '',
        },
      ]);
    },
    update(id: string, patch: Partial<RecordedStep>) {
      setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    move(id: string, by: -1 | 1) {
      setSteps((list) => {
        const i = list.findIndex((s) => s.id === id);
        const j = i + by;
        if (i < 0 || j < 0 || j >= list.length) return list;
        const next = list.slice();
        [next[i], next[j]] = [next[j]!, next[i]!];
        return next;
      });
    },
    remove(id: string) {
      setSteps((list) => list.filter((s) => s.id !== id));
    },
    clear() {
      setSteps([]);
    },
  };
}

function toTarget(locator: PickedLocator): TargetInput {
  if (typeof locator === 'string') return locator;
  if ('anchor' in locator) return anchor(locator.anchor);
  if ('tour' in locator) return byTour(locator.tour);
  return byRole(locator.role, { name: locator.name, exact: true });
}

/** Routes are written where the page changes (and on the first step). */
function withRoutes(steps: readonly RecordedStep[]) {
  return steps.map((s, i) => ({ ...s, showRoute: i === 0 || s.route !== steps[i - 1]!.route }));
}

export function recordingToJSON(steps: readonly RecordedStep[], id = 'new-tour') {
  return {
    $schema: 'https://yorigcs.github.io/awesome-tour/schema/tour.schema.json',
    id,
    steps: withRoutes(steps).map((s) => ({
      id: s.id,
      ...(s.showRoute ? { route: s.route } : {}),
      ...(s.locator ? { target: s.locator } : {}),
      ...(s.side ? { side: s.side } : {}),
      ...(s.title ? { title: s.title } : {}),
      ...(s.description ? { description: s.description } : {}),
    })),
  };
}

export function recordingToCode(steps: readonly RecordedStep[], id = 'new-tour') {
  const str = (v: string) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const used = new Set<string>(['createTour']);
  for (const s of steps) {
    if (s.code?.startsWith('anchor(')) used.add('anchor');
    if (s.code?.startsWith('byTour(')) used.add('byTour');
    if (s.code?.startsWith('byRole(')) used.add('byRole');
  }
  const lines = withRoutes(steps).map((s) => {
    const fields = [
      `id: ${str(s.id)}`,
      s.showRoute ? `route: ${str(s.route)}` : '',
      s.code ? `target: ${s.code}` : '',
      s.side ? `side: ${str(s.side)}` : '',
      `title: ${str(s.title || 'Title')}`,
      s.description ? `description: ${str(s.description)}` : '',
    ].filter(Boolean);
    return `    { ${fields.join(', ')} },`;
  });
  return `import { ${[...used].sort().join(', ')} } from '@awesome-tour/react';

export const tour = createTour({
  id: ${str(id)},
  steps: [
${lines.join('\n')}
  ],
});`;
}

function buildTour(steps: readonly RecordedStep[]) {
  return createTour({
    id: 'devtools-recording',
    preview: true, // saves nothing, tracks nothing
    steps: withRoutes(steps).map((s) => ({
      id: s.id,
      ...(s.showRoute ? { route: s.route } : {}),
      ...(s.locator ? { target: toTarget(s.locator) } : {}),
      ...(s.side ? { side: s.side } : {}),
      title: s.title || s.id,
      description: s.description,
    })),
  });
}

export function RecorderPanel({
  recording,
  manager,
  picking,
  onPick,
  container,
}: {
  recording: ReturnType<typeof useRecording>;
  manager: TourManager | null;
  picking: boolean;
  onPick: () => void;
  /** Where the play-back card renders (the devtools' own shadow root, for its styles). */
  container: HTMLElement | ShadowRoot | null;
}) {
  const { steps } = recording;
  const [playing, setPlaying] = React.useState<TourInstance<any, any> | null>(null);
  const [copied, setCopied] = React.useState<'json' | 'code' | null>(null);

  const play = () => {
    if (!steps.length) return;
    const tour = buildTour(steps);
    const unregister = manager?.register(tour);
    const stop = () => {
      unregister?.();
      tour.destroy();
      setPlaying(null);
    };
    for (const event of ['complete', 'skip', 'close'] as const) tour.on(event, stop);
    setPlaying(tour);
    if (manager) void manager.start(tour.id, { force: true, interrupt: true });
    else void tour.start();
  };

  const copy = (kind: 'json' | 'code') => {
    const text =
      kind === 'json' ? JSON.stringify(recordingToJSON(steps), null, 2) : recordingToCode(steps);
    void navigator.clipboard?.writeText(text).then(() => setCopied(kind));
  };

  return (
    <section aria-label="Tour recorder" className="atd-section-block">
      <div className="atd-row">
        <button type="button" className="atd-btn" aria-pressed={picking} onClick={onPick}>
          {picking ? 'Click an element… (Esc)' : '+ Element'}
        </button>
        <button type="button" className="atd-btn" onClick={recording.addCentered}>
          + Centered
        </button>
        <span className="atd-muted">Navigate freely between picks.</span>
      </div>
      {steps.length === 0 ? (
        <p className="atd-empty">
          Pick elements in the order the tour should visit them. Each gets the most stable target
          the picker can find.
        </p>
      ) : (
        <ol className="atd-recording" aria-label="Recorded steps">
          {steps.map((step, i) => (
            <li key={step.id} className="atd-recorded">
              <div className="atd-row">
                <span className="atd-mono">{step.id}</span>
                <span
                  className="atd-pill"
                  data-tone={step.quality === 'structural' ? 'warn' : 'ok'}
                >
                  {step.code ? step.quality : 'centered'}
                </span>
                <span className="atd-muted atd-mono">{step.route}</span>
                <span className="atd-spacer" />
                <button
                  type="button"
                  className="atd-btn"
                  aria-label={`Move ${step.id} up`}
                  disabled={i === 0}
                  onClick={() => recording.move(step.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="atd-btn"
                  aria-label={`Move ${step.id} down`}
                  disabled={i === steps.length - 1}
                  onClick={() => recording.move(step.id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="atd-btn"
                  aria-label={`Remove ${step.id}`}
                  onClick={() => recording.remove(step.id)}
                >
                  ✕
                </button>
              </div>
              {step.code && <code className="atd-mono atd-muted">{step.code}</code>}
              <input
                className="atd-input"
                aria-label={`Title of ${step.id}`}
                placeholder="Title"
                value={step.title}
                onChange={(e) => recording.update(step.id, { title: e.target.value })}
              />
              <textarea
                className="atd-input"
                aria-label={`Description of ${step.id}`}
                placeholder="Description"
                rows={2}
                value={step.description}
                onChange={(e) => recording.update(step.id, { description: e.target.value })}
              />
              {step.code && (
                <select
                  className="atd-select"
                  aria-label={`Side of ${step.id}`}
                  value={step.side}
                  onChange={(e) =>
                    recording.update(step.id, { side: e.target.value as RecordedStep['side'] })
                  }
                >
                  <option value="">Side: auto</option>
                  {(['top', 'right', 'bottom', 'left', 'start', 'end'] as const).map((side) => (
                    <option key={side} value={side}>
                      {side}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ol>
      )}
      {steps.length > 0 && (
        <div className="atd-row">
          <button type="button" className="atd-btn" onClick={play} disabled={!!playing}>
            {playing ? 'Playing…' : 'Play'}
          </button>
          <button type="button" className="atd-btn" onClick={() => copy('json')}>
            {copied === 'json' ? 'Copied' : 'Copy JSON'}
          </button>
          <button type="button" className="atd-btn" onClick={() => copy('code')}>
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" className="atd-btn" onClick={recording.clear}>
            Clear
          </button>
        </div>
      )}
      {playing && <PlaybackCard tour={playing} container={container} />}
    </section>
  );
}

/** A plain card for playing a recording back, inside the devtools' shadow root. */
function PlaybackCard({
  tour,
  container,
}: {
  tour: TourInstance<any, any>;
  container: HTMLElement | ShadowRoot | null;
}) {
  return (
    <Tour.Root tour={tour}>
      <Tour.Portal container={container as Element | null} strategy="body">
        <Tour.Overlay className="atd-play-overlay" />
        <Tour.Content className="atd-play-card" sideOffset={10}>
          <Tour.Progress className="atd-muted" />
          <Tour.Title className="atd-play-title" />
          <Tour.Description />
          <div className="atd-row">
            <Tour.Close className="atd-btn">Stop</Tour.Close>
            <span className="atd-spacer" />
            <Tour.Prev className="atd-btn">Back</Tour.Prev>
            <Tour.Next className="atd-btn">Next</Tour.Next>
          </div>
        </Tour.Content>
      </Tour.Portal>
    </Tour.Root>
  );
}
