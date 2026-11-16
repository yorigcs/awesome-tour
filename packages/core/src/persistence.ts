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
export interface PersistenceAdapter<T = PersistedTourState> {
  get(key: string): MaybePromise<T | null | undefined>;
  set(key: string, value: T): MaybePromise<void>;
  remove(key: string): MaybePromise<void>;
  /** Optional: notify about changes made elsewhere (other tabs, server push). */
  subscribe?(key: string, listener: (value: T | null) => void): () => void;
}

export function memoryStorage<T = PersistedTourState>(): PersistenceAdapter<T> {
  const map = new Map<string, T>();
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

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function webStorageAdapter<T>(
  kind: 'localStorage' | 'sessionStorage',
  prefix: string,
): PersistenceAdapter<T> {
  const storage = (): Storage | null => {
    try {
      return isBrowser ? window[kind] : null;
    } catch {
      return null;
    }
  };
  return {
    get: (key) => parse<T>(storage()?.getItem(prefix + key) ?? null),
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
      if (!isBrowser || kind !== 'localStorage') return () => {};
      const onStorage = (event: StorageEvent) => {
        if (event.key === prefix + key) listener(parse<T>(event.newValue));
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

/** localStorage-backed adapter with cross-tab sync through the `storage` event. */
export function localStorageAdapter<T = PersistedTourState>(
  options: { prefix?: string } = {},
): PersistenceAdapter<T> {
  return webStorageAdapter<T>('localStorage', options.prefix ?? 'awesome-tour:');
}

/** sessionStorage-backed adapter: progress lives as long as the browser tab. */
export function sessionStorageAdapter<T = PersistedTourState>(
  options: { prefix?: string } = {},
): PersistenceAdapter<T> {
  return webStorageAdapter<T>('sessionStorage', options.prefix ?? 'awesome-tour:');
}

export interface HttpAdapterOptions {
  /** Base URL; keys are appended: `GET/PUT/DELETE ${url}/${key}`. */
  url: string;
  /** Headers for every request (auth…), or a function returning them. */
  headers?: HeadersInit | (() => MaybePromise<HeadersInit>);
  /** Custom fetch (tests, SSR, interceptors). Default: global `fetch`. */
  fetch?: typeof fetch;
  /** Coalesce rapid writes per key (ms). Default: 300. */
  debounce?: number;
}

/**
 * Server-backed adapter, so progress follows the user across devices. Reads hit the network once
 * per key, then a local cache; writes are optimistic (cached immediately) and debounced.
 * `GET` answering 404 means "nothing saved".
 */
export function httpAdapter<T = PersistedTourState>(
  options: HttpAdapterOptions,
): PersistenceAdapter<T> {
  const { url, debounce = 300 } = options;
  const doFetch = (input: string, init: RequestInit = {}) =>
    (async () => {
      const headers =
        typeof options.headers === 'function' ? await options.headers() : options.headers;
      return (options.fetch ?? fetch)(input, { ...init, headers: { ...headers, ...init.headers } });
    })();
  const endpoint = (key: string) => `${url.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
  const cache = new Map<string, T | null>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    async get(key) {
      if (cache.has(key)) return cache.get(key) ?? null;
      try {
        const res = await doFetch(endpoint(key));
        const value = res.ok ? ((await res.json()) as T) : null;
        if (!cache.has(key)) cache.set(key, value);
        return cache.get(key) ?? null;
      } catch {
        return null; // offline: behave like "nothing saved"
      }
    },
    set(key, value) {
      cache.set(key, value);
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          void doFetch(endpoint(key), {
            method: 'PUT',
            body: JSON.stringify(cache.get(key)),
            headers: { 'content-type': 'application/json' },
          }).catch(() => {});
        }, debounce),
      );
    },
    async remove(key) {
      cache.set(key, null);
      clearTimeout(timers.get(key));
      timers.delete(key);
      await doFetch(endpoint(key), { method: 'DELETE' }).catch(() => {});
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
  /**
   * Upgrade progress saved by an older `version` instead of discarding it. `migrate[v]` turns a
   * state saved at version `v` into one for `v + 1` (return `null` to drop it); steps chain until
   * the tour's current version. Without a migration for some version, the saved state is dropped.
   */
  migrate?: Record<number, (saved: PersistedTourState) => PersistedTourState | null>;
}

const FINISHED: readonly TourStatus[] = ['completed', 'skipped'];
const PERSISTED: readonly TourStatus[] = ['active', 'paused', 'closed', 'completed', 'skipped'];

/** Applies `migrate` steps from `saved.version` up to `target`. Null when it can't get there. */
export function migrateState(
  saved: PersistedTourState,
  target: number,
  migrate: PersistOptions['migrate'] = {},
): PersistedTourState | null {
  let current: PersistedTourState | null = saved;
  while (current && current.version < target) {
    const step: ((s: PersistedTourState) => PersistedTourState | null) | undefined =
      migrate[current.version];
    if (!step) return null;
    const from: number = current.version;
    const next: PersistedTourState | null = step(current);
    current = next ? { ...next, version: from + 1 } : null;
  }
  return current && current.version === target ? current : null;
}

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
      let saved = await adapter.get(key);
      if (!saved) return;
      if (saved.version !== tour.version) {
        saved = migrateState(saved, tour.version, options.migrate);
        if (!saved) {
          await adapter.remove(key);
          return;
        }
        await adapter.set(key, saved);
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

/**
 * Read a tour's persisted state, e.g. to decide whether to show a "Resume tour" button.
 * Pass the same `key` you gave `persist()` if you customized it.
 */
export async function readTourProgress(
  adapter: PersistenceAdapter,
  tourId: string,
  options: Pick<PersistOptions, 'key'> = {},
): Promise<PersistedTourState | null> {
  const key = options.key ?? ((id: string) => id);
  return (await adapter.get(key(tourId))) ?? null;
}
