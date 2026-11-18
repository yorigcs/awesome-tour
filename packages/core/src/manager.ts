import { warn } from './diagnostics';
import { memoryStorage, type PersistenceAdapter } from './persistence';
import {
  emptyImpression,
  evaluateRules,
  type ImpressionRecord,
  trackImpressions,
  watchTriggers,
} from './rules';
import type { EligibilityReport, Listener, RouterAdapter, StartOptions, Tour } from './types';

export interface TourManagerState {
  /** Id of the tour currently on screen (active or starting). */
  activeId: string | null;
  /** Tours waiting for the active one to finish, highest priority first. */
  queue: readonly string[];
  /** Ids of registered tours. */
  tourIds: readonly string[];
}

export interface QueueOptions extends StartOptions {
  /** Higher runs first. Default: 0. */
  priority?: number;
  /** Start immediately, closing whatever is active. */
  interrupt?: boolean;
}

export interface TourManager {
  register(tour: Tour<any, any>): () => void;
  get(id: string): Tour<any, any> | undefined;
  getTours(): Tour<any, any>[];
  /** Start a tour, or queue it if another tour is on screen. */
  start(id: string, options?: QueueOptions): Promise<void>;
  setRouter(router: RouterAdapter | undefined): void;
  /** Evaluate a tour's display rules (audience, schedule, frequency, snooze). */
  explain(id: string): Promise<EligibilityReport>;
  /** Start (or queue) the tour only if its rules allow it. Resolves to whether it was started. */
  startIfEligible(id: string, options?: QueueOptions): Promise<boolean>;
  /** Fire tours whose `rules.trigger.signal` is `name`. */
  signal(name: string): void;
  /** Forget impressions (shows, outcome, snooze) of one tour, or of all. */
  resetImpressions(id?: string): Promise<void>;
  getState(): TourManagerState;
  subscribe(listener: Listener): () => void;
  /**
   * Start watching: route/signal/event triggers, impressions, queue hand-off and router wiring.
   * Managers connect on creation unless created with `connect: false` (what `TourProvider` does,
   * so render-time creation has no side effects). Returns `disconnect`.
   */
  connect(): () => void;
  destroy(): void;
}

const ON_SCREEN = new Set(['active', 'starting']);

/**
 * Coordinates several tours: only one is on screen at a time, others wait in a priority queue.
 */
export interface TourManagerOptions {
  tours?: Tour<any, any>[];
  router?: RouterAdapter;
  /**
   * Where impressions (shows, outcome, snooze) are remembered for `rules`. Default: in memory.
   * Use `localStorageAdapter({ prefix: 'tour-impressions:' })` or your API to keep them.
   */
  impressions?: PersistenceAdapter<ImpressionRecord>;
  /** Connect immediately (see `manager.connect()`). Default: true. */
  connect?: boolean;
  /**
   * A frequency cap across every tour, announcement and survey the manager starts by itself
   * (triggers, `startIfEligible`): at most `perSession` per page session, and `cooldownMs` between
   * two. Explicit `start()` calls are never capped.
   */
  cap?: { perSession?: number; cooldownMs?: number };
  /**
   * The manager's notion of "now" for rules: schedules, cooldowns, snoozes and recorded show
   * times. Default: `Date.now`. Pass a fake clock to preview a campaign or to test rules.
   */
  clock?: () => number;
}

export function createTourManager(options: TourManagerOptions = {}): TourManager {
  const impressions = options.impressions ?? memoryStorage<ImpressionRecord>();
  const clock = options.clock ?? Date.now;
  let autoShows = 0;
  /** Tours started by the manager itself that haven't shown yet. */
  const autoPending = new Set<string>();
  let lastAutoShowAt: number | null = null;
  const capCheck = (): EligibilityReport['checks'][number] | null => {
    const cap = options.cap;
    if (!cap) return null;
    if (cap.perSession != null && autoShows >= cap.perSession) {
      return {
        rule: 'cap',
        ok: false,
        detail: `${autoShows} of ${cap.perSession} automatic shows this session`,
      };
    }
    if (cap.cooldownMs != null && lastAutoShowAt != null) {
      const until = lastAutoShowAt + cap.cooldownMs;
      if (clock() < until) {
        return {
          rule: 'cap',
          ok: false,
          detail: `another tour showed; quiet until ${new Date(until).toISOString()}`,
        };
      }
    }
    return { rule: 'cap', ok: true, detail: 'within the global cap' };
  };
  interface Entry {
    tour: Tour<any, any>;
    /** Present while the manager is connected. */
    live: { unsubscribe: () => void; triggers: ReturnType<typeof watchTriggers> } | null;
  }
  const tours = new Map<string, Entry>();
  let connections = 0;
  const listeners = new Set<Listener>();
  let queue: { id: string; options: QueueOptions; order: number; eligibleOnly?: boolean }[] = [];
  /** Tours whose eligibility is being checked: concurrent triggers must not start them twice. */
  const checking = new Set<string>();
  let order = 0;
  let router = options.router;
  let routerOff: (() => void) | undefined;
  const watchRouter = () => {
    routerOff?.();
    routerOff =
      connections > 0
        ? router?.subscribe?.(() => {
            for (const entry of tours.values()) entry.live?.triggers.onRoute();
          })
        : undefined;
  };
  let state: TourManagerState = { activeId: null, queue: [], tourIds: [] };
  // Tours whose router was set by this manager — only those are reset when the router is removed,
  // so a tour's own `createTour({ router })` survives a manager (or provider) without one.
  const routed = new WeakSet<Tour<any, any>>();
  const applyRouter = (tour: Tour<any, any>) => {
    if (router) {
      tour.setRouter(router);
      routed.add(tour);
    } else if (routed.has(tour)) {
      tour.setRouter(undefined);
      routed.delete(tour);
    }
  };

  /** The blocking tour on screen. Ambient tours (banners, toasts) never hold the queue. */
  const computeActive = () => {
    for (const { tour } of tours.values())
      if (tour.layer !== 'ambient' && ON_SCREEN.has(tour.getState().status)) return tour.id;
    return null;
  };

  const update = () => {
    const activeId = computeActive();
    const queueIds = queue.map((q) => q.id);
    const tourIds = [...tours.keys()];
    if (
      activeId !== state.activeId ||
      queueIds.join() !== state.queue.join() ||
      tourIds.join() !== state.tourIds.join()
    ) {
      state = { activeId, queue: queueIds, tourIds };
      for (const listener of [...listeners]) listener();
    }
    if (activeId === null && queue.length > 0) {
      const nextItem = queue.shift()!;
      const { priority: _p, interrupt: _i, ...startOptions } = nextItem.options;
      // Rules may have changed while it waited (snoozed elsewhere, audience flipped): re-check.
      if (nextItem.eligibleOnly) void manager.startIfEligible(nextItem.id, startOptions);
      else void tours.get(nextItem.id)?.tour.start(startOptions);
      update();
    }
  };

  const attach = (entry: Entry) => {
    if (entry.live) return;
    const { tour } = entry;
    applyRouter(tour);
    const offState = tour.subscribe(update);
    const offCap = tour.on('start', () => {
      if (!autoPending.delete(tour.id)) return;
      autoShows++;
      lastAutoShowAt = clock();
    });
    const offImpressions = trackImpressions(tour, impressions, clock);
    const triggers = watchTriggers(
      tour,
      () => {
        // Triggered tours never interrupt or queue behind one on screen: the trigger fires
        // again next time (next route change, signal…).
        if (ON_SCREEN.has(tour.getState().status)) return;
        if (tour.layer !== 'ambient' && computeActive() !== null) return;
        if (queue.some((q) => q.id === tour.id)) return;
        void manager.startIfEligible(tour.id);
      },
      () => router,
    );
    entry.live = {
      triggers,
      unsubscribe: () => {
        offState();
        offCap();
        offImpressions();
        triggers.cleanup();
      },
    };
  };
  const detach = (entry: Entry) => {
    entry.live?.unsubscribe();
    entry.live = null;
  };

  async function startOrQueue(id: string, startOptions: QueueOptions, eligibleOnly: boolean) {
    const entry = tours.get(id);
    if (!entry) throw new Error(`[awesome-tour] No tour registered with id "${id}"`);
    const activeId = entry.tour.layer === 'ambient' ? null : computeActive();
    if (activeId && activeId !== id) {
      if (startOptions.interrupt) {
        tours.get(activeId)?.tour.close();
      } else {
        queue = queue.filter((q) => q.id !== id);
        queue.push({ id, options: startOptions, order: order++, eligibleOnly });
        queue.sort(
          (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0) || a.order - b.order,
        );
        update();
        return;
      }
    }
    const { priority: _p, interrupt: _i, ...rest } = startOptions;
    await entry.tour.start(rest);
  }

  const manager: TourManager = {
    register(tour) {
      const previous = tours.get(tour.id);
      if (previous && previous.tour !== tour) {
        warn(
          'AT007',
          `a second tour with the id "${tour.id}" was registered; it replaces the first.`,
        );
      }
      if (previous) detach(previous);
      const entry: Entry = { tour, live: null };
      tours.set(tour.id, entry);
      if (connections > 0) attach(entry);
      update();
      return () => {
        const current = tours.get(tour.id);
        if (current !== entry) return;
        detach(entry);
        tours.delete(tour.id);
        queue = queue.filter((q) => q.id !== tour.id);
        update();
      };
    },
    get: (id) => tours.get(id)?.tour,
    getTours: () => [...tours.values()].map((e) => e.tour),
    start: (id, startOptions = {}) => {
      autoPending.delete(id); // an explicit start isn't an automatic show
      return startOrQueue(id, startOptions, false);
    },
    setRouter(next) {
      router = next;
      if (connections > 0) for (const { tour } of tours.values()) applyRouter(tour);
      watchRouter();
      for (const entry of tours.values()) entry.live?.triggers.onRoute();
    },
    async explain(id) {
      const tour = tours.get(id)?.tour;
      if (!tour) throw new Error(`[awesome-tour] No tour registered with id "${id}"`);
      const report = await evaluateRules(
        tour,
        (await impressions.get(id)) ?? emptyImpression(),
        clock(),
      );
      const cap = capCheck();
      if (!cap) return report;
      return { ...report, eligible: report.eligible && cap.ok, checks: [...report.checks, cap] };
    },
    async startIfEligible(id, startOptions = {}) {
      if (checking.has(id)) return false;
      checking.add(id);
      try {
        const report = await manager.explain(id);
        if (!report.eligible) return false;
        const priority = tours.get(id)?.tour.rules?.priority;
        // Counted against the cap when it actually shows (it may wait in the queue first).
        autoPending.add(id);
        await startOrQueue(
          id,
          { ...(priority != null ? { priority } : {}), ...startOptions },
          true,
        );
        return true;
      } finally {
        checking.delete(id);
      }
    },
    signal(name) {
      for (const entry of tours.values()) entry.live?.triggers.onSignal(name);
    },
    async resetImpressions(id) {
      const ids = id ? [id] : [...tours.keys()];
      await Promise.all(ids.map((t) => impressions.remove(t)));
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect() {
      connections++;
      if (connections === 1) {
        watchRouter();
        for (const entry of tours.values()) attach(entry);
        update();
      }
      let connected = true;
      return () => {
        if (!connected) return;
        connected = false;
        connections--;
        if (connections === 0) {
          routerOff?.();
          routerOff = undefined;
          for (const entry of tours.values()) detach(entry);
        }
      };
    },
    destroy() {
      routerOff?.();
      connections = 0;
      for (const entry of tours.values()) detach(entry);
      tours.clear();
      queue = [];
      listeners.clear();
    },
  };

  for (const tour of options.tours ?? []) manager.register(tour);
  if (options.connect !== false) manager.connect();
  return manager;
}
