import { isBrowser } from './dom';
import type { MaybePromise, Tour, TourPlugin, TourStatus } from './types';

export interface PersistedTourState {
  status: TourStatus;
  stepId: string | null;
  version: number;
  data?: unknown;
  updatedAt: number;
  /** The last run's goal: when it was armed, and when it was reached. */
  goal?: { since: number; reachedAt?: number };
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
  /** Retries for a failed write (network error or non-2xx), with exponential backoff. Default: 3. */
  retries?: number;
  /** First retry delay (ms); doubles each time. Default: 500. */
  retryDelay?: number;
  /**
   * Poll subscribed keys this often (ms) so progress made on another device shows up here.
   * Default: off (no `subscribe`).
   */
  pollInterval?: number;
  /**
   * A read that fails (offline, 5xx, 401): `empty` (default) behaves like "nothing saved" without
   * caching it, so the next read tries again; `throw` rejects, so callers can tell "unknown" apart.
   */
  readErrors?: 'empty' | 'throw';
  /** Called for every failed request (after retries, for writes). */
  onError?: (error: unknown, info: { key: string; method: 'GET' | 'PUT' | 'DELETE' }) => void;
}

export interface HttpPersistenceAdapter<T> extends PersistenceAdapter<T> {
  /** Send pending (debounced) writes now. Also runs on `pagehide`, with `keepalive`. */
  flush(): Promise<void>;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    method: string,
    url: string,
  ) {
    super(`[awesome-tour] ${method} ${url} answered ${status}`);
    this.name = 'HttpError';
  }
}

/**
 * Server-backed adapter, so progress follows the user across devices. Reads hit the network once
 * per key, then a local cache; writes are optimistic (cached immediately), debounced, retried with
 * backoff and flushed with `keepalive` when the page is hidden. `GET` answering 404 means
 * "nothing saved".
 */
export function httpAdapter<T = PersistedTourState>(
  options: HttpAdapterOptions,
): HttpPersistenceAdapter<T> {
  const { url, debounce = 300, retries = 3, retryDelay = 500, readErrors = 'empty' } = options;
  const doFetch = async (input: string, init: RequestInit = {}) => {
    const headers =
      typeof options.headers === 'function' ? await options.headers() : options.headers;
    return (options.fetch ?? fetch)(input, { ...init, headers: { ...headers, ...init.headers } });
  };
  const endpoint = (key: string) => `${url.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
  const report = (error: unknown, key: string, method: 'GET' | 'PUT' | 'DELETE') => {
    if (options.onError) options.onError(error, { key, method });
  };
  const cache = new Map<string, T | null>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Keys with a write not yet acknowledged by the server. */
  const dirty = new Set<string>();

  async function put(key: string, keepalive = false): Promise<void> {
    dirty.delete(key);
    const body = JSON.stringify(cache.get(key));
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await doFetch(endpoint(key), {
          method: 'PUT',
          body,
          keepalive,
          headers: { 'content-type': 'application/json' },
        });
        if (!res.ok) throw new HttpError(res.status, 'PUT', endpoint(key));
        return;
      } catch (error) {
        // A newer write supersedes this one; client errors (4xx) won't succeed on retry.
        const clientError =
          error instanceof HttpError && error.status < 500 && error.status !== 429;
        if (dirty.has(key)) return;
        if (attempt >= retries || keepalive || clientError) {
          report(error, key, 'PUT');
          return;
        }
        await new Promise((r) => setTimeout(r, retryDelay * 2 ** attempt));
        if (dirty.has(key)) return;
      }
    }
  }

  async function flush(keepalive = false) {
    const keys = [...timers.keys()];
    for (const key of keys) {
      clearTimeout(timers.get(key));
      timers.delete(key);
    }
    await Promise.all(keys.map((key) => put(key, keepalive)));
  }

  if (isBrowser) {
    const onHide = () => {
      if (timers.size > 0) void flush(true);
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
  }

  async function read(key: string): Promise<T | null> {
    const res = await doFetch(endpoint(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new HttpError(res.status, 'GET', endpoint(key));
    return (await res.json()) as T;
  }

  const adapter: HttpPersistenceAdapter<T> = {
    async get(key) {
      if (cache.has(key)) return cache.get(key) ?? null;
      try {
        const value = await read(key);
        if (!cache.has(key)) cache.set(key, value);
        return cache.get(key) ?? null;
      } catch (error) {
        report(error, key, 'GET');
        if (readErrors === 'throw') throw error;
        return null; // not cached: the next read tries the network again
      }
    },
    set(key, value) {
      cache.set(key, value);
      dirty.add(key);
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          void put(key);
        }, debounce),
      );
    },
    async remove(key) {
      cache.set(key, null);
      dirty.delete(key);
      clearTimeout(timers.get(key));
      timers.delete(key);
      try {
        const res = await doFetch(endpoint(key), { method: 'DELETE' });
        if (!res.ok && res.status !== 404) throw new HttpError(res.status, 'DELETE', endpoint(key));
      } catch (error) {
        report(error, key, 'DELETE');
      }
    },
    flush: () => flush(false),
  };

  if (options.pollInterval != null) {
    const interval = options.pollInterval;
    adapter.subscribe = (key, listener) => {
      let last = JSON.stringify(cache.get(key) ?? null);
      const timer = setInterval(async () => {
        if (timers.has(key) || dirty.has(key)) return; // our own write is pending
        try {
          const value = await read(key);
          const json = JSON.stringify(value);
          if (json === last) return;
          last = json;
          cache.set(key, value);
          listener(value);
        } catch (error) {
          report(error, key, 'GET');
        }
      }, interval);
      return () => clearInterval(timer);
    };
  }
  return adapter;
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
  /**
   * Keep tabs in sync: a tour finished in another tab closes here, and starting (or resuming) it
   * in one tab pauses it in the others, so it never runs twice at once. Default: true.
   */
  sync?: boolean;
  /**
   * Upgrade progress saved by an older `version` instead of discarding it. `migrate[v]` turns a
   * state saved at version `v` into one for `v + 1` (return `null` to drop it); steps chain until
   * the tour's current version. Without a migration for some version, the saved state is dropped.
   */
  migrate?: Record<number, (saved: PersistedTourState) => PersistedTourState | null>;
  /**
   * Storage failures (a rejected `set`, an unreadable value). Default: a console warning.
   * A failed read never blocks an explicit `start({ force: true })`.
   */
  onError?: (error: unknown, info: { key: string; operation: 'get' | 'set' | 'remove' }) => void;
}

const FINISHED: readonly TourStatus[] = ['completed', 'skipped'];
const PERSISTED: readonly TourStatus[] = ['active', 'paused', 'closed', 'completed', 'skipped'];
const STATUSES: readonly TourStatus[] = [
  'idle',
  'starting',
  'active',
  'paused',
  'completed',
  'skipped',
  'closed',
];

/** Whether `value` looks like something `persist()` wrote (storage can hold anything). */
export function isPersistedTourState(value: unknown): value is PersistedTourState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === 'string' &&
    STATUSES.includes(v.status as TourStatus) &&
    (v.stepId === null || typeof v.stepId === 'string') &&
    typeof v.version === 'number' &&
    Number.isFinite(v.version)
  );
}

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

const tabId = Math.random().toString(36).slice(2);

/** Plugin that saves tour progress and restores it on `start()`. */
export function persist(adapter: PersistenceAdapter, options: PersistOptions = {}): TourPlugin {
  const { resume = true, once = true, persistData = false, sync = true } = options;
  const keyOf = options.key ?? ((id: string) => id);
  const onError =
    options.onError ??
    ((error: unknown, info: { key: string; operation: string }) =>
      console.warn(`[awesome-tour] persist: ${info.operation} "${info.key}" failed`, error));
  /** Keys saved by a newer tour version: this (older) version must not overwrite them. */
  const frozen = new Set<string>();
  const guard = (key: string, operation: 'get' | 'set' | 'remove', run: () => unknown) => {
    try {
      const result = run();
      if (result instanceof Promise) result.catch((error) => onError(error, { key, operation }));
    } catch (error) {
      onError(error, { key, operation });
    }
  };

  return {
    name: 'persist',
    setup(tour: Tour) {
      const key = keyOf(tour.id);
      let last = '';
      /** Set while another tab takes the tour over: this tab's pause must not be saved. */
      let yielding = false;
      /** The goal of the latest run, kept across reloads so it's counted when it happens later. */
      let goal: PersistedTourState['goal'];
      /** What an earlier visit saved: rewritten as-is (plus the goal) while this tab hasn't run it. */
      let previous: PersistedTourState | null = null;
      const write = () => {
        const { status, stepId, data } = tour.getState();
        if (yielding || frozen.has(key)) return;
        if (!PERSISTED.includes(status)) {
          if (previous && goal) {
            const saved = { ...previous, goal, updatedAt: Date.now() };
            guard(key, 'set', () => adapter.set(key, saved));
          }
          return;
        }
        guard(key, 'set', () =>
          adapter.set(key, {
            status,
            stepId,
            version: tour.version,
            updatedAt: Date.now(),
            ...(persistData ? { data } : {}),
            ...(goal ? { goal } : {}),
          }),
        );
      };
      const unsubscribe = tour.subscribe(() => {
        const { status, stepId } = tour.getState();
        const signature = `${status}|${stepId}`;
        if (signature === last && !persistData) return;
        last = signature;
        write();
      });
      const offGoal = [
        tour.on('start', () => {
          goal = { since: Date.now() };
          write();
        }),
        tour.on('goal', () => {
          goal = { ...(goal ?? { since: Date.now() }), reachedAt: Date.now() };
          write();
        }),
      ];
      // A run from an earlier visit whose goal hasn't happened yet: keep watching for it.
      Promise.resolve()
        .then(() => adapter.get(key))
        .then((saved) => {
          if (!isPersistedTourState(saved) || saved.version !== tour.version) return;
          previous = saved;
          if (!saved.goal || saved.goal.reachedAt != null || goal) return;
          goal = saved.goal;
          tour.trackGoal(saved.goal.since);
        })
        .catch((error) => onError(error, { key, operation: 'get' }));
      const unsubscribeRemote =
        sync && adapter.subscribe
          ? adapter.subscribe(key, (value) => {
              if (!isPersistedTourState(value) || value.version !== tour.version) return;
              if (!tour.isOpen()) return;
              last = `${value.status}|${value.stepId}`;
              if (value.status === 'completed') tour.complete();
              else if (value.status === 'skipped') tour.skip();
            })
          : undefined;

      // One tab at a time: announce when the tour shows here; pause it where it was showing.
      let channel: BroadcastChannel | null = null;
      const offs: (() => void)[] = [];
      if (sync && isBrowser && typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(`awesome-tour:${key}`);
        channel.onmessage = (event: MessageEvent) => {
          const message = event.data as { type?: string; tab?: string } | null;
          if (message?.type !== 'claim' || message.tab === tabId || !tour.isOpen()) return;
          yielding = true;
          try {
            tour.pause();
          } finally {
            yielding = false;
            last = '';
          }
        };
        const claim = () => channel?.postMessage({ type: 'claim', tab: tabId });
        offs.push(tour.on('start', claim), tour.on('resume', claim));
      }
      return () => {
        unsubscribe();
        unsubscribeRemote?.();
        for (const off of [...offs, ...offGoal]) off();
        channel?.close();
      };
    },
    async beforeStart(tour, startOptions) {
      const key = keyOf(tour.id);
      let saved: PersistedTourState | null | undefined;
      try {
        saved = await adapter.get(key);
      } catch (error) {
        onError(error, { key, operation: 'get' });
        // Unknown progress: only an explicit, forced start goes ahead.
        return startOptions.force ? undefined : false;
      }
      frozen.delete(key);
      if (!saved) return;
      if (!isPersistedTourState(saved)) {
        onError(new Error('[awesome-tour] ignoring malformed saved progress'), {
          key,
          operation: 'get',
        });
        guard(key, 'remove', () => adapter.remove(key));
        return;
      }
      if (saved.version !== tour.version) {
        if (saved.version > tour.version) {
          frozen.add(key);
          console.warn(
            `[awesome-tour] persist: "${key}" was saved by version ${saved.version}, newer than the tour (${tour.version}); ignoring it.`,
          );
          return;
        }
        saved = migrateState(saved, tour.version, options.migrate);
        if (!saved) {
          guard(key, 'remove', () => adapter.remove(key));
          return;
        }
        const migrated = saved;
        guard(key, 'set', () => adapter.set(key, migrated));
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
