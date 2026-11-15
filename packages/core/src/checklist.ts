import type { TourManager } from './manager';
import type { PersistenceAdapter } from './persistence';
import { createStore } from './store';
import type { Listener, Tour } from './types';

export type ChecklistItemStatus = 'pending' | 'done' | 'skipped';

export interface ChecklistItemDefinition {
  id: string;
  /** Tour that completes this item when it is completed. A tour id needs a connected manager. */
  tour?: string | Tour<any, any>;
  /** Complete this item when `checklist.signal(name)` is called. */
  signal?: string;
  /** Complete this item when the predicate is true (checked on `refresh()`). */
  when?: () => boolean;
  /** Free-form data for rendering (title, description, icon…). */
  meta?: Record<string, unknown>;
}

export interface ChecklistSnapshot {
  items: Record<string, ChecklistItemStatus>;
  dismissed: boolean;
  updatedAt: number;
}

export interface ChecklistState {
  items: Readonly<Record<string, ChecklistItemStatus>>;
  /** Items done or skipped. */
  completed: number;
  total: number;
  /** 0..1 */
  progress: number;
  /** Every item is done or skipped. */
  done: boolean;
  dismissed: boolean;
  /** Persisted state has been loaded. */
  hydrated: boolean;
}

export interface ChecklistOptions {
  id: string;
  items: readonly ChecklistItemDefinition[];
  persistence?: PersistenceAdapter<ChecklistSnapshot>;
  /** Called once when the last item is completed. */
  onComplete?: () => void;
}

export interface Checklist {
  readonly id: string;
  getItems(): readonly ChecklistItemDefinition[];
  getItem(id: string): ChecklistItemDefinition | undefined;
  getState(): ChecklistState;
  subscribe(listener: Listener): () => void;
  complete(id: string): void;
  skip(id: string): void;
  /** Reset one item, or everything (including `dismissed`) when called without an id. */
  reset(id?: string): void;
  dismiss(): void;
  restore(): void;
  signal(name: string): void;
  /** Re-evaluate `when` predicates. */
  refresh(): void;
  /** Link tours (by id through a manager, or instances) so completing them completes items. */
  connect(manager?: TourManager): () => void;
  /** Start the tour linked to an item. */
  startItem(id: string): Promise<void>;
  /** Resolves once persisted state is loaded. */
  ready(): Promise<void>;
  destroy(): void;
}

function derive(
  items: readonly ChecklistItemDefinition[],
  statuses: Record<string, ChecklistItemStatus>,
  dismissed: boolean,
  hydrated: boolean,
): ChecklistState {
  const completed = items.filter((i) => statuses[i.id] && statuses[i.id] !== 'pending').length;
  const total = items.length;
  return {
    items: statuses,
    completed,
    total,
    progress: total ? completed / total : 0,
    done: total > 0 && completed === total,
    dismissed,
    hydrated,
  };
}

/** An onboarding checklist: tasks completed by tours, signals, predicates, or by hand. */
export function createChecklist(options: ChecklistOptions): Checklist {
  const { items, persistence } = options;
  const initial = Object.fromEntries(items.map((i) => [i.id, 'pending' as ChecklistItemStatus]));
  const store = createStore<ChecklistState>(derive(items, initial, false, !persistence));
  const cleanups: (() => void)[] = [];
  let manager: TourManager | undefined;
  let notifiedComplete = false;

  const update = (
    statuses: Record<string, ChecklistItemStatus>,
    dismissed = store.getState().dismissed,
  ) => {
    const prev = store.getState();
    const next = derive(items, statuses, dismissed, prev.hydrated);
    store.setState(next);
    if (next.done && !prev.done && !notifiedComplete) {
      notifiedComplete = true;
      options.onComplete?.();
    }
    if (!next.done) notifiedComplete = false;
    if (persistence && next.hydrated) {
      void persistence.set(options.id, {
        items: { ...statuses },
        dismissed,
        updatedAt: Date.now(),
      });
    }
  };

  const setStatus = (id: string, status: ChecklistItemStatus) => {
    if (!items.some((i) => i.id === id)) return;
    const current = store.getState().items;
    if (current[id] === status) return;
    update({ ...current, [id]: status });
  };

  const refresh = () => {
    for (const item of items) {
      if (!item.when || store.getState().items[item.id] !== 'pending') continue;
      try {
        if (item.when()) setStatus(item.id, 'done');
      } catch (error) {
        console.error(`[awesome-tour] checklist item "${item.id}" \`when\` threw`, error);
      }
    }
  };

  const hydration = (async () => {
    if (!persistence) return;
    try {
      const saved = await persistence.get(options.id);
      const statuses = { ...initial };
      for (const item of items) {
        const s = saved?.items[item.id];
        if (s) statuses[item.id] = s;
      }
      // Merge with anything completed before hydration finished.
      for (const [id, s] of Object.entries(store.getState().items))
        if (s !== 'pending') statuses[id] = s;
      const prevDone = derive(items, statuses, false, true).done;
      notifiedComplete = prevDone; // don't re-fire onComplete for an already finished checklist
      store.setState(derive(items, statuses, saved?.dismissed ?? false, true));
    } catch (error) {
      console.error('[awesome-tour] failed to load checklist state', error);
      store.setState({ hydrated: true });
    }
    refresh();
  })();

  const resolveTour = (item: ChecklistItemDefinition) =>
    typeof item.tour === 'string' ? manager?.get(item.tour) : item.tour;

  /** Item id → the tour instance we listen to. Re-hooked when a tour id maps to a new instance. */
  const hooked = new Map<string, { tour: Tour<any, any>; off: () => void }>();
  const hookTours = () => {
    for (const item of items) {
      if (!item.tour) continue;
      const tour = resolveTour(item);
      const current = hooked.get(item.id);
      if (current?.tour === tour) continue;
      current?.off();
      hooked.delete(item.id);
      if (!tour) continue;
      if (tour.getState().status === 'completed') setStatus(item.id, 'done');
      hooked.set(item.id, { tour, off: tour.on('complete', () => setStatus(item.id, 'done')) });
    }
  };
  const unhookAll = () => {
    for (const { off } of hooked.values()) off();
    hooked.clear();
  };

  const checklist: Checklist = {
    id: options.id,
    getItems: () => items,
    getItem: (id) => items.find((i) => i.id === id),
    getState: store.getState,
    subscribe: store.subscribe,
    complete: (id) => setStatus(id, 'done'),
    skip: (id) => setStatus(id, 'skipped'),
    reset(id) {
      if (id) setStatus(id, 'pending');
      else update({ ...initial }, false);
    },
    dismiss: () => update({ ...store.getState().items }, true),
    restore: () => update({ ...store.getState().items }, false),
    signal(name) {
      for (const item of items) if (item.signal === name) setStatus(item.id, 'done');
    },
    refresh,
    connect(next) {
      manager = next;
      hookTours();
      const unsubscribe = next?.subscribe(hookTours);
      let connected = true;
      const disconnect = () => {
        if (!connected) return;
        connected = false;
        unsubscribe?.();
        unhookAll();
        if (manager === next) manager = undefined;
        cleanups.splice(cleanups.indexOf(disconnect), 1);
      };
      cleanups.push(disconnect);
      return disconnect;
    },
    async startItem(id) {
      const item = items.find((i) => i.id === id);
      if (!item?.tour) return;
      hookTours();
      if (typeof item.tour === 'string') {
        if (!manager)
          throw new Error(
            `[awesome-tour] checklist item "${id}" references tour "${item.tour}" but no manager is connected`,
          );
        await manager.start(item.tour, { force: true, interrupt: true });
      } else {
        await item.tour.start({ force: true });
      }
    },
    ready: () => hydration,
    destroy() {
      unhookAll();
      for (const cleanup of [...cleanups]) cleanup();
    },
  };

  hookTours();
  return checklist;
}
