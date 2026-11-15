import { isBrowser, isElement } from './dom';
import type { PersistenceAdapter } from './persistence';
import { matchRoute } from './router';
import { resolveTarget } from './targets';
import type {
  DateInput,
  EligibilityReport,
  EligibilityRule,
  RouterAdapter,
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
  snoozedUntil: number | null;
}

export const emptyImpression = (): ImpressionRecord => ({
  shows: 0,
  lastShownAt: null,
  finished: false,
  snoozedUntil: null,
});

const toTime = (d: DateInput) => (d instanceof Date ? d.getTime() : new Date(d).getTime());
const when = (t: number) => new Date(t).toISOString();

/** Evaluates a tour's rules against its impression record. Pure apart from `audience`. */
export async function evaluateRules(
  tour: Tour<any, any>,
  record: ImpressionRecord,
  now = Date.now(),
): Promise<EligibilityReport> {
  const rules: TourRules = tour.rules ?? {};
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
  if (frequency.once !== false) {
    add(
      'once',
      !record.finished,
      record.finished ? 'already finished or dismissed' : 'not finished yet',
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
): () => void {
  const update = async (patch: (r: ImpressionRecord) => Partial<ImpressionRecord>) => {
    const current = (await store.get(tour.id)) ?? emptyImpression();
    await store.set(tour.id, { ...current, ...patch(current) });
  };
  const offs = [
    tour.on('start', () => void update((r) => ({ shows: r.shows + 1, lastShownAt: Date.now() }))),
    tour.on('complete', () => void update(() => ({ finished: true }))),
    tour.on('skip', () => void update(() => ({ finished: true }))),
    tour.on('close', () => void update(() => ({ finished: true }))),
    // `snooze` follows its `close`: it isn't a dismissal, just "later".
    tour.on('snooze', ({ until }) => void update(() => ({ finished: false, snoozedUntil: until }))),
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
  const onSignal = (name: string) => {
    if (trigger?.signal === name) fire();
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
      const mo = new MutationObserver(check);
      mo.observe(document.body, { childList: true, subtree: true });
      const interval = setInterval(check, 500);
      const stop = () => {
        mo.disconnect();
        clearInterval(interval);
      };
      cleanups.push(stop);
      queueMicrotask(check);
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
