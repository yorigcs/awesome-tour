import {
  type ChecklistInstance,
  type EligibilityReport,
  getTargetsRect,
  KEEP_ATTRIBUTE,
  matchRoute,
  type RectLike,
  resolveTarget,
  type StepDefinition,
  type TourEvents,
  type TourInstance,
  type TourManagerState,
  useStoreSelector,
  useTourProvider,
} from '@awesome-tour/react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { type PickedTarget, stepSnippet, suggestTarget, usePicker } from './picker';
import { RecorderPanel, useRecording } from './recorder';
import { css } from './styles';

export interface TourDevtoolsProps {
  /** Extra tours to inspect (tours registered on the `TourProvider` are listed automatically). */
  tours?: TourInstance<any, any>[];
  /** Checklists to inspect. */
  checklists?: ChecklistInstance[];
  position?: 'bottom-left' | 'bottom-right';
  defaultOpen?: boolean;
  /** Toggle shortcut, e.g. `'alt+shift+t'` (default). `false` disables it. */
  shortcut?: string | false;
  /** Render inside a shadow root so app styles don't leak in. Default: true. */
  isolate?: boolean;
}

const EVENT_NAMES: (keyof TourEvents)[] = [
  'start',
  'stepChange',
  'stepLeave',
  'targetMissing',
  'complete',
  'skip',
  'close',
  'pause',
  'resume',
  'dataChange',
  'error',
  'snooze',
  'goal',
  'targetLost',
];

interface LoggedEvent {
  id: number;
  time: number;
  tourId: string;
  name: keyof TourEvents;
  detail: string;
}

const emptyManagerState: TourManagerState = { activeId: null, queue: [], tourIds: [] };
const noopStore = { subscribe: () => () => {}, getState: () => emptyManagerState };
const OPEN_KEY = 'awesome-tour-devtools:open';

function readOpen(fallback: boolean) {
  try {
    const v = window.localStorage.getItem(OPEN_KEY);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

function matchesShortcut(event: KeyboardEvent, shortcut: string) {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  const code = /^[a-z]$/.test(key)
    ? `Key${key.toUpperCase()}`
    : /^\d$/.test(key)
      ? `Digit${key}`
      : key;
  return (
    event.code.toLowerCase() === code.toLowerCase() &&
    event.altKey === parts.includes('alt') &&
    event.shiftKey === parts.includes('shift') &&
    event.ctrlKey === parts.includes('ctrl') &&
    event.metaKey === parts.includes('meta')
  );
}

function summarize(name: keyof TourEvents, payload: unknown): string {
  const p = payload as Record<string, unknown>;
  switch (name) {
    case 'stepChange':
      return `${p.from ?? '∅'} → ${p.to} (${p.direction})`;
    case 'error':
      return p.error instanceof Error ? p.error.message : String(p.error);
    case 'dataChange':
      return safeJson(p.data, 0).slice(0, 80);
    case 'goal':
      return `${p.name} after ${Math.round(Number(p.afterMs) / 1000)}s (${p.status})`;
    case 'targetLost':
      return `${p.stepId} ${p.recovered ? 'recovered' : 'lost'}`;
    default:
      return p.stepId ? String(p.stepId) : '';
  }
}

function safeJson(value: unknown, space = 2) {
  try {
    return JSON.stringify(value, null, space) ?? 'undefined';
  } catch {
    return '[unserializable]';
  }
}

/* -------------------------------------------------------------------------------------------------
 * Host (shadow root portal)
 * -----------------------------------------------------------------------------------------------*/

function useHost(isolate: boolean) {
  const [container, setContainer] = React.useState<HTMLElement | ShadowRoot | null>(null);
  React.useEffect(() => {
    const host = document.createElement('div');
    host.setAttribute(KEEP_ATTRIBUTE, '');
    host.setAttribute('data-awesome-tour-devtools', '');
    document.body.appendChild(host);
    if (isolate && host.attachShadow) {
      const shadow = host.attachShadow({ mode: 'open' });
      setContainer(shadow);
    } else {
      setContainer(host);
    }
    return () => {
      host.remove();
      setContainer(null);
    };
  }, [isolate]);
  return container;
}

/* -------------------------------------------------------------------------------------------------
 * Devtools
 * -----------------------------------------------------------------------------------------------*/

/**
 * Floating inspector for tours and checklists. Render it in development only:
 *
 * @example
 * {import.meta.env.DEV && <TourDevtools />}
 */
const NO_TOURS: TourInstance<any, any>[] = [];

export function TourDevtools({
  tours: extraTours = NO_TOURS,
  checklists = [],
  position = 'bottom-left',
  defaultOpen = false,
  shortcut = 'alt+shift+t',
  isolate = true,
}: TourDevtoolsProps) {
  const container = useHost(isolate);
  const provider = useTourProvider();
  const managerState = useStoreSelector(provider?.manager ?? noopStore);
  const tours = React.useMemo(() => {
    const list: TourInstance<any, any>[] = [];
    for (const id of managerState.tourIds) {
      const tour = provider?.manager.get(id);
      if (tour) list.push(tour);
    }
    for (const tour of extraTours) if (!list.includes(tour)) list.push(tour);
    return list;
  }, [managerState.tourIds, provider, extraTours]);

  const [open, setOpenState] = React.useState(defaultOpen);
  React.useEffect(() => setOpenState(readOpen(defaultOpen)), [defaultOpen]);
  const setOpen = React.useCallback((next: boolean) => {
    setOpenState(next);
    writeOpen(next);
  }, []);

  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        setOpenState((o) => {
          writeOpen(!o);
          return !o;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const events = useEventLog(tours);
  const funnel = useFunnel(tours);
  const [tab, setTab] = React.useState<
    'tours' | 'funnel' | 'record' | 'rules' | 'events' | 'checklists'
  >('tours');
  const recording = useRecording();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected =
    tours.find((t) => t.id === selectedId) ??
    tours.find((t) => t.id === managerState.activeId) ??
    tours.find((t) => t.isOpen()) ??
    tours[0];
  const anyActive = tours.some((t) => t.getState().status === 'active');

  // One picker, two uses: inspect an element, or record it as the next step.
  const [picking, setPicking] = React.useState<false | 'inspect' | 'record'>(false);
  const [picked, setPicked] = React.useState<PickedTarget | null>(null);
  const [copied, setCopied] = React.useState(false);
  const hovered = usePicker(
    picking !== false,
    (el) => {
      const suggestion = suggestTarget(el);
      if (picking === 'record') recording.addTarget(suggestion);
      else {
        setPicked(suggestion);
        setCopied(false);
      }
      setPicking(false);
    },
    () => setPicking(false),
  );
  const exportState = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      manager: managerState,
      tours: tours.map((t) => {
        const { targets: _targets, ...state } = t.getState();
        return { id: t.id, version: t.version, state, steps: t.getSteps().map((st) => st.id) };
      }),
      events,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `awesome-tour-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!container) return null;

  return createPortal(
    <>
      <style>{css}</style>
      <div className={`atd-root ${position === 'bottom-right' ? 'atd-right' : 'atd-left'}`}>
        {open && (
          <section className="atd-panel" aria-label="awesome-tour devtools">
            <header className="atd-header">
              <span className="atd-title">awesome-tour</span>
              {(['tours', 'funnel', 'record', 'rules', 'events', 'checklists'] as const).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    className="atd-tab"
                    aria-pressed={tab === t}
                    onClick={() => setTab(t)}
                  >
                    {t === 'tours'
                      ? `Tours (${tours.length})`
                      : t === 'funnel'
                        ? 'Funnel'
                        : t === 'record'
                          ? `Record${recording.steps.length ? ` (${recording.steps.length})` : ''}`
                          : t === 'rules'
                            ? 'Rules'
                            : t === 'events'
                              ? `Events (${events.length})`
                              : `Checklists (${checklists.length})`}
                  </button>
                ),
              )}
              <button
                type="button"
                className="atd-tab"
                aria-pressed={picking === 'inspect'}
                title="Click any element on the page to get a stable target for a step"
                onClick={() => setPicking((p) => (p === 'inspect' ? false : 'inspect'))}
              >
                {picking === 'inspect' ? 'Picking… (Esc)' : 'Pick element'}
              </button>
              <button type="button" className="atd-tab" onClick={exportState}>
                Export JSON
              </button>
            </header>
            <div className="atd-body">
              {picked && (
                <section className="atd-section-block" aria-label="Picked element">
                  <div className="atd-row">
                    <span className="atd-section">Target</span>
                    <span
                      className="atd-pill"
                      data-tone={picked.quality === 'structural' ? 'warn' : 'ok'}
                    >
                      {picked.quality}
                    </span>
                    <button
                      type="button"
                      className="atd-btn"
                      onClick={() => {
                        void navigator.clipboard
                          ?.writeText(stepSnippet(picked))
                          .then(() => setCopied(true));
                      }}
                    >
                      {copied ? 'Copied' : 'Copy step'}
                    </button>
                    <button type="button" className="atd-btn" onClick={() => setPicked(null)}>
                      Clear
                    </button>
                  </div>
                  <pre className="atd-pre" data-testid="picked-snippet">
                    {stepSnippet(picked)}
                  </pre>
                  {picked.quality === 'structural' && (
                    <p className="atd-muted">
                      No stable hook on this element: add a data-tour attribute or a Tour.Anchor for
                      a selector that survives refactors.
                    </p>
                  )}
                </section>
              )}
              {tab === 'tours' &&
                (selected ? (
                  <>
                    <div className="atd-row">
                      <label className="atd-muted" htmlFor="atd-tour-select">
                        Tour
                      </label>
                      <select
                        id="atd-tour-select"
                        className="atd-select"
                        value={selected.id}
                        onChange={(e) => setSelectedId(e.target.value)}
                      >
                        {tours.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id}
                            {managerState.queue.includes(t.id) ? ' (queued)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <TourInspector key={selected.id} tour={selected} open={open} />
                  </>
                ) : (
                  <p className="atd-empty">
                    No tours. Register tours on a TourProvider or pass `tours`.
                  </p>
                ))}
              {tab === 'funnel' && <FunnelPanel tours={tours} funnel={funnel} />}
              {tab === 'record' && (
                <RecorderPanel
                  recording={recording}
                  manager={provider?.manager ?? null}
                  picking={picking === 'record'}
                  onPick={() => setPicking((p) => (p === 'record' ? false : 'record'))}
                  container={container}
                />
              )}
              {tab === 'rules' && <RulesPanel tours={tours} />}
              {tab === 'events' && <EventList events={events} />}
              {tab === 'checklists' &&
                (checklists.length ? (
                  checklists.map((c) => <ChecklistInspector key={c.id} checklist={c} />)
                ) : (
                  <p className="atd-empty">Pass `checklists` to inspect them.</p>
                ))}
            </div>
          </section>
        )}
        {picking && hovered && (
          <div
            className="atd-highlight"
            aria-hidden="true"
            style={{
              top: hovered.top - 3,
              left: hovered.left - 3,
              width: hovered.width + 6,
              height: hovered.height + 6,
            }}
          />
        )}
        <button
          type="button"
          className="atd-launcher"
          aria-expanded={open}
          aria-label={open ? 'Close tour devtools' : 'Open tour devtools'}
          onClick={() => setOpen(!open)}
        >
          <span className="atd-dot" data-active={anyActive ? '' : undefined} aria-hidden="true" />
          Tours
        </button>
      </div>
    </>,
    container,
  );
}

/* -------------------------------------------------------------------------------------------------
 * Rules: "why didn't my tour show?"
 * -----------------------------------------------------------------------------------------------*/

function RulesPanel({ tours }: { tours: TourInstance<any, any>[] }) {
  const manager = useTourProvider()?.manager;
  const [reports, setReports] = React.useState<Record<string, EligibilityReport>>({});
  const [version, setVersion] = React.useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` forces a re-evaluation
  React.useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    void Promise.all(tours.filter((t) => manager.get(t.id)).map((t) => manager.explain(t.id))).then(
      (list) => {
        if (!cancelled) setReports(Object.fromEntries(list.map((r) => [r.tourId, r])));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [manager, tours, version]);

  if (!manager) {
    return <p className="atd-empty">Rules are evaluated by the TourProvider's manager.</p>;
  }
  const refresh = () => setVersion((v) => v + 1);
  return (
    <>
      <div className="atd-row">
        <button type="button" className="atd-btn" onClick={refresh}>
          Re-evaluate
        </button>
        <button
          type="button"
          className="atd-btn"
          onClick={() => void manager.resetImpressions().then(refresh)}
        >
          Reset all impressions
        </button>
      </div>
      {Object.values(reports).map((report) => {
        const tour = manager.get(report.tourId);
        const trigger = tour?.rules?.trigger;
        return (
          <div key={report.tourId} className="atd-section-block">
            <div className="atd-row">
              <strong className="atd-mono">{report.tourId}</strong>
              <span className="atd-pill" data-tone={report.eligible ? 'ok' : 'bad'}>
                {report.eligible ? 'eligible' : 'blocked'}
              </span>
              {trigger && (
                <span className="atd-pill" data-tone="accent">
                  trigger: {Object.keys(trigger).join(', ')}
                </span>
              )}
            </div>
            <ul className="atd-steps" aria-label={`Rules for ${report.tourId}`}>
              {report.checks.map((c) => (
                <li key={c.rule} className="atd-row">
                  <span className="atd-pill" data-tone={c.ok ? 'ok' : 'bad'}>
                    {c.ok ? '✓' : '✗'} {c.rule}
                  </span>
                  <span className="atd-muted">{c.detail}</span>
                </li>
              ))}
            </ul>
            <div className="atd-row">
              <button
                type="button"
                className="atd-btn"
                onClick={() => void manager.startIfEligible(report.tourId).then(refresh)}
              >
                Start if eligible
              </button>
              <button
                type="button"
                className="atd-btn"
                onClick={() => void manager.resetImpressions(report.tourId).then(refresh)}
              >
                Reset impressions
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Funnel: where people drop off, from this session's runs.
 * -----------------------------------------------------------------------------------------------*/

export interface TourFunnel {
  runs: number;
  /** Step id → runs that reached it (once per run). */
  reached: Record<string, number>;
  completed: number;
  skipped: number;
  dismissed: number;
  goals: number;
}

const emptyFunnel = (): TourFunnel => ({
  runs: 0,
  reached: {},
  completed: 0,
  skipped: 0,
  dismissed: 0,
  goals: 0,
});

/** Aggregates every run of `tours` seen while mounted. */
export function useFunnel(tours: TourInstance<any, any>[]) {
  const [funnel, setFunnel] = React.useState<Record<string, TourFunnel>>({});
  React.useEffect(() => {
    const seen = new Map<string, Set<string>>(); // tour id → steps reached in the current run
    const bump = (id: string, change: (f: TourFunnel) => TourFunnel) =>
      setFunnel((prev) => ({ ...prev, [id]: change(prev[id] ?? emptyFunnel()) }));
    const offs = tours.flatMap((tour) => [
      tour.on('start', () => {
        seen.set(tour.id, new Set());
        bump(tour.id, (f) => ({ ...f, runs: f.runs + 1 }));
      }),
      tour.on('stepChange', ({ to }) => {
        const steps = seen.get(tour.id) ?? new Set<string>();
        seen.set(tour.id, steps);
        if (steps.has(to)) return;
        steps.add(to);
        bump(tour.id, (f) => ({ ...f, reached: { ...f.reached, [to]: (f.reached[to] ?? 0) + 1 } }));
      }),
      tour.on('complete', () => bump(tour.id, (f) => ({ ...f, completed: f.completed + 1 }))),
      tour.on('skip', () => bump(tour.id, (f) => ({ ...f, skipped: f.skipped + 1 }))),
      tour.on('close', () => bump(tour.id, (f) => ({ ...f, dismissed: f.dismissed + 1 }))),
      tour.on('goal', () => bump(tour.id, (f) => ({ ...f, goals: f.goals + 1 }))),
    ]);
    return () => {
      for (const off of offs) off();
    };
  }, [tours]);
  return funnel;
}

function FunnelPanel({
  tours,
  funnel,
}: {
  tours: TourInstance<any, any>[];
  funnel: Record<string, TourFunnel>;
}) {
  const ran = tours.filter((t) => (funnel[t.id]?.runs ?? 0) > 0);
  if (ran.length === 0) {
    return <p className="atd-empty">Run a tour: each step's reach and drop-off shows up here.</p>;
  }
  const pct = (n: number, of: number) => `${of ? Math.round((n / of) * 100) : 0}%`;
  return (
    <div className="atd-funnels">
      {ran.map((tour) => {
        const f = funnel[tour.id]!;
        const steps = tour.getSteps() as readonly { id: string }[];
        return (
          <section key={tour.id} className="atd-section-block" aria-label={`Funnel for ${tour.id}`}>
            <div className="atd-row">
              <span className="atd-mono">{tour.id}</span>
              <span className="atd-pill">
                {f.runs} run{f.runs === 1 ? '' : 's'}
              </span>
            </div>
            <ol className="atd-funnel">
              {steps.map((step, i) => {
                const n = f.reached[step.id] ?? 0;
                const prev = i === 0 ? f.runs : (f.reached[steps[i - 1]!.id] ?? 0);
                const drop = prev - n;
                return (
                  <li key={step.id}>
                    <span className="atd-mono">{step.id}</span>
                    <span className="atd-bar" aria-hidden="true">
                      <span style={{ width: pct(n, f.runs) }} />
                    </span>
                    <span className="atd-mono">
                      {n} · {pct(n, f.runs)}
                      {i > 0 && drop > 0 && <span className="atd-drop"> −{drop}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="atd-muted atd-mono">
              {f.completed} completed · {f.skipped} skipped · {f.dismissed} closed
              {f.goals ? ` · ${f.goals} reached the goal (${pct(f.goals, f.runs)})` : ''}
            </p>
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Event log
 * -----------------------------------------------------------------------------------------------*/

function useEventLog(tours: TourInstance<any, any>[]) {
  const [events, setEvents] = React.useState<LoggedEvent[]>([]);
  const counter = React.useRef(0);
  React.useEffect(() => {
    const offs = tours.flatMap((tour) =>
      EVENT_NAMES.map((name) =>
        tour.on(name, (payload) => {
          const entry: LoggedEvent = {
            id: counter.current++,
            time: Date.now(),
            tourId: tour.id,
            name,
            detail: summarize(name, payload),
          };
          setEvents((prev) => [entry, ...prev].slice(0, 100));
        }),
      ),
    );
    return () => {
      for (const off of offs) off();
    };
  }, [tours]);
  return events;
}

function EventList({ events }: { events: LoggedEvent[] }) {
  if (events.length === 0) return <p className="atd-empty">No events yet.</p>;
  return (
    <ol className="atd-events" aria-label="Tour events">
      {events.map((e) => (
        <li key={e.id}>
          <span className="atd-muted atd-mono">
            {new Date(e.time).toLocaleTimeString([], { hour12: false })}
          </span>
          <span className="atd-mono">{e.name}</span>
          <span className="atd-mono atd-muted">
            {e.tourId}
            {e.detail ? ` · ${e.detail}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Tour inspector
 * -----------------------------------------------------------------------------------------------*/

type Health = { tone: 'ok' | 'warn' | 'bad' | undefined; label: string; count: number };

function targetHealth(tour: TourInstance<any, any>, step: StepDefinition): Health {
  if (step.target == null) return { tone: undefined, label: 'centered', count: 0 };
  const count = resolveTarget(step.target, tour.anchors).length;
  if (count > 0) return { tone: 'ok', label: count > 1 ? `${count} targets` : 'found', count };
  if (
    step.route &&
    typeof window !== 'undefined' &&
    !matchRoute(step.route, window.location.pathname)
  ) {
    return { tone: 'warn', label: `on ${step.route}`, count };
  }
  return { tone: 'bad', label: 'missing', count };
}

const STATUS_TONE: Record<string, Health['tone'] | 'accent'> = {
  active: 'ok',
  starting: 'accent',
  paused: 'warn',
  completed: 'accent',
  skipped: 'warn',
  closed: undefined,
  idle: undefined,
};

function TourInspector({ tour, open }: { tour: TourInstance<any, any>; open: boolean }) {
  const state = useStoreSelector(tour);
  const [tick, setTick] = React.useState(0);
  const [highlight, setHighlight] = React.useState<RectLike | null>(null);

  // Re-evaluate target health periodically (targets come and go with the UI).
  React.useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `tick` forces re-evaluation
  const steps = React.useMemo(() => {
    const visible = new Set(tour.getVisibleSteps().map((s) => s.id));
    return tour
      .getSteps()
      .map((step) => ({ step, visible: visible.has(step.id), health: targetHealth(tour, step) }));
  }, [tour, state, tick]);

  const showTarget = (step: StepDefinition) => {
    const nodes = step.target == null ? [] : resolveTarget(step.target, tour.anchors);
    setHighlight(getTargetsRect(nodes));
  };

  const running =
    state.status === 'active' || state.status === 'starting' || state.status === 'paused';
  const pct = state.progress.total ? (state.progress.current / state.progress.total) * 100 : 0;

  return (
    <>
      <div className="atd-row">
        <span className="atd-pill" data-tone={STATUS_TONE[state.status]}>
          {state.status}
        </span>
        {state.phase && <span className="atd-pill">{state.phase}</span>}
        <span className="atd-pill">v{tour.version}</span>
        <span className="atd-pill">{tour.modal ? 'modal' : 'non-modal'}</span>
        {state.targetMissing && (
          <span className="atd-pill" data-tone="bad">
            target missing
          </span>
        )}
      </div>
      <div className="atd-row">
        <span className="atd-muted atd-mono">
          {state.progress.current}/{state.progress.total}
        </span>
        <div className="atd-progress" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="atd-row">
        <button type="button" className="atd-btn" onClick={() => void tour.start({ force: true })}>
          Restart
        </button>
        <button
          type="button"
          className="atd-btn"
          disabled={state.status !== 'active'}
          onClick={() => void tour.prev()}
        >
          Prev
        </button>
        <button
          type="button"
          className="atd-btn"
          disabled={state.status !== 'active'}
          onClick={() => void tour.next()}
        >
          Next
        </button>
        {state.status === 'paused' || state.status === 'closed' ? (
          <button type="button" className="atd-btn" onClick={() => void tour.resume()}>
            Resume
          </button>
        ) : (
          <button
            type="button"
            className="atd-btn"
            disabled={state.status !== 'active'}
            onClick={() => tour.pause()}
          >
            Pause
          </button>
        )}
        <button
          type="button"
          className="atd-btn"
          disabled={!running}
          onClick={() => tour.complete()}
        >
          Complete
        </button>
        <button type="button" className="atd-btn" disabled={!running} onClick={() => tour.close()}>
          Close
        </button>
      </div>

      <p className="atd-section">Steps</p>
      <ol className="atd-steps">
        {steps.map(({ step, visible, health }, index) => (
          <li key={step.id}>
            <button
              type="button"
              className="atd-step"
              aria-current={state.stepId === step.id ? 'step' : undefined}
              data-hidden={visible ? undefined : ''}
              title={visible ? `Go to "${step.id}"` : `"${step.id}" is hidden by its \`when\``}
              onClick={() => void tour.goTo(step.id)}
              onMouseEnter={() => showTarget(step)}
              onMouseLeave={() => setHighlight(null)}
              onFocus={() => showTarget(step)}
              onBlur={() => setHighlight(null)}
            >
              <span className="atd-index atd-mono">{index + 1}</span>
              <span className="atd-mono">
                {step.id}
                {step.route ? <span className="atd-muted"> {step.route}</span> : null}
                {!visible ? <span className="atd-muted"> (hidden)</span> : null}
              </span>
              <span className="atd-pill" data-tone={health.tone}>
                {health.label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="atd-section">Data</p>
      <pre className="atd-pre atd-mono">{safeJson(state.data)}</pre>
      {state.error != null && (
        <>
          <p className="atd-section">Last error</p>
          <pre className="atd-pre atd-mono">{summarize('error', { error: state.error })}</pre>
        </>
      )}
      {highlight && highlight.width + highlight.height > 0 && (
        <div
          className="atd-highlight"
          style={{
            top: highlight.top - 3,
            left: highlight.left - 3,
            width: highlight.width + 6,
            height: highlight.height + 6,
          }}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Checklist inspector
 * -----------------------------------------------------------------------------------------------*/

function ChecklistInspector({ checklist }: { checklist: ChecklistInstance }) {
  const state = useStoreSelector(checklist);
  return (
    <div>
      <div className="atd-row">
        <strong className="atd-mono">{checklist.id}</strong>
        <span className="atd-pill" data-tone={state.done ? 'ok' : undefined}>
          {state.completed}/{state.total}
        </span>
        {state.dismissed && (
          <span className="atd-pill" data-tone="warn">
            dismissed
          </span>
        )}
        {!state.hydrated && <span className="atd-pill">loading</span>}
        <button type="button" className="atd-btn" onClick={() => checklist.reset()}>
          Reset
        </button>
      </div>
      <ol className="atd-steps">
        {checklist.getItems().map((item) => {
          const status = state.items[item.id] ?? 'pending';
          return (
            <li key={item.id}>
              <button
                type="button"
                className="atd-step"
                title={status === 'pending' ? 'Mark as done' : 'Mark as pending'}
                onClick={() =>
                  status === 'pending' ? checklist.complete(item.id) : checklist.reset(item.id)
                }
              >
                <span className="atd-index">
                  {status === 'done' ? '✓' : status === 'skipped' ? '–' : '○'}
                </span>
                <span className="atd-mono">
                  {item.id}
                  <span className="atd-muted">
                    {item.tour
                      ? ` tour:${typeof item.tour === 'string' ? item.tour : item.tour.id}`
                      : ''}
                    {item.signal ? ` signal:${item.signal}` : ''}
                    {item.when ? ' when()' : ''}
                  </span>
                </span>
                <span
                  className="atd-pill"
                  data-tone={status === 'done' ? 'ok' : status === 'skipped' ? 'warn' : undefined}
                >
                  {status}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
