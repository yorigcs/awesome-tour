import {
  type ChecklistInstance,
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
  const [tab, setTab] = React.useState<'tours' | 'events' | 'checklists'>('tours');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected =
    tours.find((t) => t.id === selectedId) ??
    tours.find((t) => t.id === managerState.activeId) ??
    tours.find((t) => t.isOpen()) ??
    tours[0];
  const anyActive = tours.some((t) => t.getState().status === 'active');

  if (!container) return null;

  return createPortal(
    <>
      <style>{css}</style>
      <div className={`atd-root ${position === 'bottom-right' ? 'atd-right' : 'atd-left'}`}>
        {open && (
          <section className="atd-panel" aria-label="awesome-tour devtools">
            <header className="atd-header">
              <span className="atd-title">awesome-tour</span>
              {(['tours', 'events', 'checklists'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="atd-tab"
                  aria-pressed={tab === t}
                  onClick={() => setTab(t)}
                >
                  {t === 'tours'
                    ? `Tours (${tours.length})`
                    : t === 'events'
                      ? `Events (${events.length})`
                      : `Checklists (${checklists.length})`}
                </button>
              ))}
            </header>
            <div className="atd-body">
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
