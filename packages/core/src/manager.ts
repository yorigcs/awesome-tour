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
}

export function createTourManager(options: TourManagerOptions = {}): TourManager {
  const impressions = options.impressions ?? memoryStorage<ImpressionRecord>();
  const tours = new Map<
    string,
    {
      tour: Tour<any, any>;
      unsubscribe: () => void;
      triggers: ReturnType<typeof watchTriggers>;
    }
  >();
  const listeners = new Set<Listener>();
  let queue: { id: string; options: QueueOptions; order: number }[] = [];
  let order = 0;
  let router = options.router;
  let routerOff: (() => void) | undefined;
  const watchRouter = () => {
    routerOff?.();
    routerOff = router?.subscribe?.(() => {
      for (const entry of tours.values()) entry.triggers.onRoute();
    });
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

  const computeActive = () => {
    for (const { tour } of tours.values())
      if (ON_SCREEN.has(tour.getState().status)) return tour.id;
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
      void tours.get(nextItem.id)?.tour.start(startOptions);
      update();
    }
  };

  const manager: TourManager = {
    register(tour) {
      tours.get(tour.id)?.unsubscribe();
      applyRouter(tour);
      const offState = tour.subscribe(update);
      const offImpressions = trackImpressions(tour, impressions);
      const triggers = watchTriggers(
        tour,
        () => {
          // Triggered tours never interrupt or queue behind one on screen: the trigger fires
          // again next time (next route change, signal…).
          if (computeActive() !== null || queue.some((q) => q.id === tour.id)) return;
          void manager.startIfEligible(tour.id);
        },
        () => router,
      );
      const unsubscribe = () => {
        offState();
        offImpressions();
        triggers.cleanup();
      };
      tours.set(tour.id, { tour, unsubscribe, triggers });
      update();
      return () => {
        const entry = tours.get(tour.id);
        if (entry?.tour !== tour) return;
        entry.unsubscribe();
        tours.delete(tour.id);
        queue = queue.filter((q) => q.id !== tour.id);
        update();
      };
    },
    get: (id) => tours.get(id)?.tour,
    getTours: () => [...tours.values()].map((e) => e.tour),
    async start(id, startOptions = {}) {
      const entry = tours.get(id);
      if (!entry) throw new Error(`[awesome-tour] No tour registered with id "${id}"`);
      const activeId = computeActive();
      if (activeId && activeId !== id) {
        if (startOptions.interrupt) {
          tours.get(activeId)?.tour.close();
        } else {
          queue = queue.filter((q) => q.id !== id);
          queue.push({ id, options: startOptions, order: order++ });
          queue.sort(
            (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0) || a.order - b.order,
          );
          update();
          return;
        }
      }
      const { priority: _p, interrupt: _i, ...rest } = startOptions;
      await entry.tour.start(rest);
    },
    setRouter(next) {
      router = next;
      for (const { tour } of tours.values()) applyRouter(tour);
      watchRouter();
      for (const entry of tours.values()) entry.triggers.onRoute();
    },
    async explain(id) {
      const tour = tours.get(id)?.tour;
      if (!tour) throw new Error(`[awesome-tour] No tour registered with id "${id}"`);
      return evaluateRules(tour, (await impressions.get(id)) ?? emptyImpression());
    },
    async startIfEligible(id, startOptions = {}) {
      const report = await manager.explain(id);
      if (!report.eligible) return false;
      const priority = tours.get(id)?.tour.rules?.priority;
      await manager.start(id, { ...(priority != null ? { priority } : {}), ...startOptions });
      return true;
    },
    signal(name) {
      for (const entry of tours.values()) entry.triggers.onSignal(name);
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
    destroy() {
      routerOff?.();
      for (const { unsubscribe } of tours.values()) unsubscribe();
      tours.clear();
      queue = [];
      listeners.clear();
    },
  };

  watchRouter();
  for (const tour of options.tours ?? []) manager.register(tour);
  return manager;
}
