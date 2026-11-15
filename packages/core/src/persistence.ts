import { isBrowser } from './dom';
import type { MaybePromise, Tour, TourPlugin, TourStatus } from './types';

export interface PersistedTourState {
  status: TourStatus;
  stepId: string | null;
  version: number;
  data?: unknown;
  updatedAt: number;
}

/** Storage backend. Can be sync (localStorage) or async (your API). */
export interface PersistenceAdapter {
  get(key: string): MaybePromise<PersistedTourState | null | undefined>;
  set(key: string, value: PersistedTourState): MaybePromise<void>;
  remove(key: string): MaybePromise<void>;
  /** Optional: notify about changes made elsewhere (other tabs, server push). */
  subscribe?(key: string, listener: (value: PersistedTourState | null) => void): () => void;
}

export function memoryStorage(): PersistenceAdapter {
  const map = new Map<string, PersistedTourState>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function parse(raw: string | null): PersistedTourState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedTourState;
  } catch {
    return null;
  }
}

/** localStorage-backed adapter with cross-tab sync through the `storage` event. */
export function localStorageAdapter(options: { prefix?: string } = {}): PersistenceAdapter {
  const prefix = options.prefix ?? 'awesome-tour:';
  const storage = (): Storage | null => {
    try {
      return isBrowser ? window.localStorage : null;
    } catch {
      return null;
    }
  };
  return {
    get: (key) => parse(storage()?.getItem(prefix + key) ?? null),
    set: (key, value) => {
      try {
        storage()?.setItem(prefix + key, JSON.stringify(value));
      } catch {
        /* quota / privacy mode */
      }
    },
    remove: (key) => {
      try {
        storage()?.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
    },
    subscribe(key, listener) {
      if (!isBrowser) return () => {};
      const onStorage = (event: StorageEvent) => {
        if (event.key === prefix + key) listener(parse(event.newValue));
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

export interface PersistOptions {
  /** Storage key for a tour. Default: the tour id. */
  key?: (tourId: string) => string;
  /** Resume from the last seen step when the tour is started again. Default: true. */
  resume?: boolean;
  /** Don't start tours that were completed or skipped (unless started with `force`). Default: true. */
  once?: boolean;
  /** Also persist `tour.data`. Default: false. */
  persistData?: boolean;
  /** Close the tour here when it is finished in another tab. Default: true. */
  sync?: boolean;
}

const FINISHED: readonly TourStatus[] = ['completed', 'skipped'];
const PERSISTED: readonly TourStatus[] = ['active', 'paused', 'closed', 'completed', 'skipped'];

/** Plugin that saves tour progress and restores it on `start()`. */
export function persist(adapter: PersistenceAdapter, options: PersistOptions = {}): TourPlugin {
  const { resume = true, once = true, persistData = false, sync = true } = options;
  const keyOf = options.key ?? ((id: string) => id);

  return {
    name: 'persist',
    setup(tour: Tour) {
      const key = keyOf(tour.id);
      let last = '';
      const unsubscribe = tour.subscribe(() => {
        const { status, stepId, data } = tour.getState();
        if (!PERSISTED.includes(status)) return;
        const signature = `${status}|${stepId}`;
        if (signature === last && !persistData) return;
        last = signature;
        void adapter.set(key, {
          status,
          stepId,
          version: tour.version,
          updatedAt: Date.now(),
          ...(persistData ? { data } : {}),
        });
      });
      const unsubscribeRemote =
        sync && adapter.subscribe
          ? adapter.subscribe(key, (value) => {
              if (!value || value.version !== tour.version || !tour.isOpen()) return;
              last = `${value.status}|${value.stepId}`;
              if (value.status === 'completed') tour.complete();
              else if (value.status === 'skipped') tour.skip();
            })
          : undefined;
      return () => {
        unsubscribe();
        unsubscribeRemote?.();
      };
    },
    async beforeStart(tour, startOptions) {
      const key = keyOf(tour.id);
      const saved = await adapter.get(key);
      if (!saved) return;
      if (saved.version !== tour.version) {
        await adapter.remove(key);
        return;
      }
      if (startOptions.force) return;
      if (once && FINISHED.includes(saved.status)) return false;
      return {
        ...(resume && saved.stepId != null ? { stepId: saved.stepId } : {}),
        ...(persistData && saved.data ? { data: saved.data as object } : {}),
      };
    },
  };
}

/** Read a tour's persisted state, e.g. to decide whether to show a "Resume tour" button. */
export async function readTourProgress(
  adapter: PersistenceAdapter,
  tourId: string,
): Promise<PersistedTourState | null> {
  return (await adapter.get(tourId)) ?? null;
}
