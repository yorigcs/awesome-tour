import { isBrowser, isElement, subscribeDomActivity, subscribeTicker } from './dom';
import type { PersistenceAdapter } from './persistence';
import { matchRoute } from './router';
import { resolveTarget } from './targets';
import type {
  DateInput,
  EligibilityReport,
  EligibilityRule,
  RouterAdapter,
  TargetInput,
  Tour,
  TourRules,
} from './types';

/** What the manager remembers about a tour between visits (impressions, snooze, outcome). */
export interface ImpressionRecord {
  /** How many times the tour was shown. */
  shows: number;
  lastShownAt: number | null;
  /** Completed, skipped or dismissed: `once` keeps it from auto-starting again. */
  finished: boolean;
  /**
   * How the last run ended: `completed`, `skipped` (the user opted out) or `dismissed` (closed,
   * e.g. Escape). Absent in records written before 0.2.
   */
  outcome?: 'completed' | 'skipped' | 'dismissed' | null;
  snoozedUntil: number | null;
  /** Tour `version` of the last show (for `frequency.perVersion`). */
  version?: number;
}

export const emptyImpression = (): ImpressionRecord => ({
  shows: 0,
  lastShownAt: null,
  finished: false,
  outcome: null,
  snoozedUntil: null,
});

const toTime = (d: DateInput) => {
  const time = d instanceof Date ? d.getTime() : new Date(d).getTime();
  if (Number.isNaN(time)) console.warn(`[awesome-tour] rules.schedule: invalid date ${String(d)}`);
  return time;
};
const when = (t: number) => new Date(t).toISOString();

/** Evaluates a tour's rules against its impression record. Pure apart from `audience`. */
export async function evaluateRules(
  tour: Tour<any, any>,
  initial: ImpressionRecord,
  now = Date.now(),
): Promise<EligibilityReport> {
  let record = initial;
  const rules: TourRules = tour.rules ?? {};
  // Per-version counting: a record from an older version doesn't hold a new one back.
  if (rules.frequency?.perVersion && record.version != null && record.version < tour.version) {
    record = emptyImpression();
  }
  const checks: EligibilityReport['checks'] = [];
  const add = (rule: EligibilityRule, ok: boolean, detail: string) =>
    checks.push({ rule, ok, detail });

  if (rules.audience) {
    let ok = false;
    let detail = 'audience() returned false';
    try {
      ok = (await rules.audience({ data: tour.getState().data })) !== false;
      if (ok) detail = 'audience() returned true';
    } catch (error) {
      detail = `audience() threw: ${String(error)}`;
    }
    add('audience', ok, detail);
  }

  const { startsAt, endsAt } = rules.schedule ?? {};
  if (startsAt != null || endsAt != null) {
    const from = startsAt != null ? toTime(startsAt) : -Infinity;
    const to = endsAt != null ? toTime(endsAt) : Infinity;
    const ok = now >= from && now <= to;
    add(
      'schedule',
      ok,
      ok ? 'within the schedule' : now < from ? `starts at ${when(from)}` : `ended at ${when(to)}`,
    );
  }

  const frequency = rules.frequency ?? {};
  const once = frequency.once ?? true;
  if (once !== false) {
    // Records written before `outcome` existed only know `finished`.
    const outcome = record.outcome ?? (record.finished ? 'dismissed' : null);
    let ok: boolean;
    let detail: string;
    if (once === 'seen') {
      ok = record.shows === 0;
      detail = ok ? 'never shown' : `already shown ${record.shows} time(s)`;
    } else if (once === 'completed') {
      ok = outcome !== 'completed' && outcome !== 'skipped';
      detail = ok
        ? outcome === 'dismissed'
          ? 'dismissed, not completed: may show again'
          : 'not finished yet'
        : `already ${outcome}`;
    } else {
      ok = !record.finished;
      detail = ok ? 'not finished yet' : `already ${outcome ?? 'finished or dismissed'}`;
    }
    add('once', ok, detail);
  }
  if (
    frequency.dismissCooldownMs != null &&
    record.outcome === 'dismissed' &&
    record.lastShownAt != null
  ) {
    const until = record.lastShownAt + frequency.dismissCooldownMs;
    add(
      'cooldown',
      now >= until,
      now >= until ? 'dismissal cooldown over' : `dismissed; cooling down until ${when(until)}`,
    );
  }
  if (frequency.maxShows != null) {
    const ok = record.shows < frequency.maxShows;
    add('maxShows', ok, `shown ${record.shows} of ${frequency.maxShows} times`);
  }
  if (frequency.cooldownMs != null && record.lastShownAt != null) {
    const until = record.lastShownAt + frequency.cooldownMs;
    add(
      'cooldown',
      now >= until,
      now >= until ? 'cooldown over' : `cooling down until ${when(until)}`,
    );
  }
  if (record.snoozedUntil != null) {
    const ok = now >= record.snoozedUntil;
    add('snooze', ok, ok ? 'snooze over' : `snoozed until ${when(record.snoozedUntil)}`);
  }

  return { tourId: tour.id, eligible: checks.every((c) => c.ok), checks };
}

/**
 * Records impressions from a tour's events into `store` (show count, outcome, snooze).
 * Returns a cleanup.
 */
export function trackImpressions(
  tour: Tour<any, any>,
  store: PersistenceAdapter<ImpressionRecord>,
  clock: () => number = Date.now,
): () => void {
  // Serialized per tour: `close` then `snooze` must not interleave their read-modify-writes.
  let queue: Promise<void> = Promise.resolve();
  const update = (patch: (r: ImpressionRecord) => Partial<ImpressionRecord>) => {
    queue = queue
      .then(async () => {
        const current = (await store.get(tour.id)) ?? emptyImpression();
        await store.set(tour.id, { ...current, ...patch(current) });
      })
      .catch((error) => console.warn('[awesome-tour] saving impressions failed', error));
    return queue;
  };
  const offs = [
    tour.on(
      'start',
      () =>
        void update((r) => {
          // A new version under `perVersion` starts counting from zero.
          const fresh =
            tour.rules?.frequency?.perVersion && r.version != null && r.version < tour.version;
          const base = fresh ? emptyImpression() : r;
          return { ...base, shows: base.shows + 1, lastShownAt: clock(), version: tour.version };
        }),
    ),
    tour.on('complete', () => void update(() => ({ finished: true, outcome: 'completed' }))),
    tour.on('skip', () => void update(() => ({ finished: true, outcome: 'skipped' }))),
    tour.on('close', () => void update(() => ({ finished: true, outcome: 'dismissed' }))),
    // `snooze` follows its `close`: it isn't a dismissal, just "later".
    tour.on(
      'snooze',
      // `until` is in real time; re-base the duration on the manager's clock.
      ({ until }) =>
        void update(() => ({
          finished: false,
          outcome: null,
          snoozedUntil: clock() + (until - Date.now()),
        })),
    ),
  ];
  return () => {
    for (const off of offs) off();
  };
}

/**
 * Wires a tour's `rules.trigger` to `fire`. `getRouter` is read lazily so the manager can swap
 * routers; call the returned `onRoute()` whenever the route may have changed.
 */
export function watchTriggers(
  tour: Tour<any, any>,
  fire: () => void,
  getRouter: () => RouterAdapter | undefined,
): { onRoute: () => void; onSignal: (name: string) => void; cleanup: () => void } {
  const trigger = tour.rules?.trigger;
  const cleanups: (() => void)[] = [];
  const onRoute = () => {
    const router = getRouter();
    if (!trigger?.route || !router) return;
    if ((router.match ?? matchRoute)(trigger.route, router.getPath())) fire();
  };
  const repeats: number[] = [];
  const onSignal = (name: string) => {
    if (trigger?.signal === name) fire();
    const repeat = trigger?.repeat;
    if (repeat && repeat.signal === name) {
      const now = Date.now();
      repeats.push(now);
      const window = repeat.within ?? Number.POSITIVE_INFINITY;
      while (repeats.length && now - repeats[0]! > window) repeats.shift();
      if (repeats.length >= (repeat.times ?? 2)) {
        repeats.length = 0;
        fire();
      }
    }
  };
  const inside = (target: TargetInput, event: Event) => {
    const path = event.composedPath();
    return resolveTarget(target, tour.anchors).some((n) => isElement(n) && path.includes(n));
  };

  if (trigger && isBrowser) {
    if (trigger.delay != null) {
      const timer = setTimeout(fire, trigger.delay);
      cleanups.push(() => clearTimeout(timer));
    }
    if (trigger.event) {
      const { type, target } = trigger.event;
      const listener = (event: Event) => {
        if (!target) return fire();
        const path = event.composedPath();
        const nodes = resolveTarget(target, tour.anchors);
        if (nodes.some((n) => isElement(n) && path.includes(n))) fire();
      };
      document.addEventListener(type, listener, true);
      cleanups.push(() => document.removeEventListener(type, listener, true));
    }
    if (trigger.targetVisible != null) {
      const target = trigger.targetVisible;
      const check = () => {
        if (resolveTarget(target, tour.anchors).length === 0) return;
        stop();
        fire();
      };
      const offActivity = subscribeDomActivity(check);
      const offTicker = subscribeTicker(500, check);
      const stop = () => {
        offActivity();
        offTicker();
      };
      cleanups.push(stop);
      queueMicrotask(check);
    }
    if (trigger.dwell) {
      const { target, ms = 2000 } = trigger.dwell;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let hovering = false;
      let focused = false;
      const update = () => {
        if (hovering || focused) {
          if (!timer) {
            timer = setTimeout(() => {
              timer = undefined;
              fire();
            }, ms);
          }
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      };
      const onOver = (e: Event) => {
        hovering = inside(target, e);
        update();
      };
      const onFocus = (e: Event) => {
        focused = e.type === 'focusin' && inside(target, e);
        update();
      };
      document.addEventListener('pointerover', onOver, true);
      document.addEventListener('focusin', onFocus, true);
      document.addEventListener('focusout', onFocus, true);
      cleanups.push(() => {
        clearTimeout(timer);
        document.removeEventListener('pointerover', onOver, true);
        document.removeEventListener('focusin', onFocus, true);
        document.removeEventListener('focusout', onFocus, true);
      });
    }
    if (trigger.idle != null) {
      const ms = trigger.idle;
      let timer = setTimeout(fire, ms);
      const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(fire, ms);
      };
      const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];
      for (const type of events) {
        document.addEventListener(type, reset, { capture: true, passive: true });
      }
      cleanups.push(() => {
        clearTimeout(timer);
        for (const type of events) document.removeEventListener(type, reset, true);
      });
    }
    if (trigger.rageClick) {
      const { target, clicks = 3, within = 800 } = trigger.rageClick;
      let last: EventTarget | null = null;
      let times: number[] = [];
      const onClick = (e: Event) => {
        if (target && !inside(target, e)) return;
        const now = Date.now();
        if (e.target !== last) {
          last = e.target;
          times = [];
        }
        times = [...times.filter((t) => now - t <= within), now];
        if (times.length >= clicks) {
          times = [];
          fire();
        }
      };
      document.addEventListener('click', onClick, true);
      cleanups.push(() => document.removeEventListener('click', onClick, true));
    }
    if (trigger.route) queueMicrotask(onRoute);
  }

  return {
    onRoute,
    onSignal,
    cleanup: () => {
      for (const c of cleanups.splice(0)) c();
    },
  };
}
