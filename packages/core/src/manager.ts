import type { Listener, RouterAdapter, StartOptions, Tour } from './types';

export interface TourManagerState {
  /** Id of the tour currently on screen (active or starting). */
  activeId: string | null;
  /** Tours waiting for the active one to finish, highest priority first. */
  queue: readonly string[];
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
  getState(): TourManagerState;
  subscribe(listener: Listener): () => void;
  destroy(): void;
}

const ON_SCREEN = new Set(['active', 'starting']);

/**
 * Coordinates several tours: only one is on screen at a time, others wait in a priority queue.
 */
export function createTourManager(
  options: { tours?: Tour<any, any>[]; router?: RouterAdapter } = {},
): TourManager {
  const tours = new Map<string, { tour: Tour<any, any>; unsubscribe: () => void }>();
  const listeners = new Set<Listener>();
  let queue: { id: string; options: QueueOptions; order: number }[] = [];
  let order = 0;
  let router = options.router;
  let state: TourManagerState = { activeId: null, queue: [] };

  const computeActive = () => {
    for (const { tour } of tours.values())
      if (ON_SCREEN.has(tour.getState().status)) return tour.id;
    return null;
  };

  const update = () => {
    const activeId = computeActive();
    const queueIds = queue.map((q) => q.id);
    if (activeId !== state.activeId || queueIds.join() !== state.queue.join()) {
      state = { activeId, queue: queueIds };
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
      if (router) tour.setRouter(router);
      const unsubscribe = tour.subscribe(update);
      tours.set(tour.id, { tour, unsubscribe });
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
      for (const { tour } of tours.values()) tour.setRouter(next);
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      for (const { unsubscribe } of tours.values()) unsubscribe();
      tours.clear();
      queue = [];
      listeners.clear();
    },
  };

  for (const tour of options.tours ?? []) manager.register(tour);
  return manager;
}
