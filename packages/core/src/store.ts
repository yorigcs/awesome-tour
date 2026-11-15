import type { Listener } from './types';

export interface Store<T> {
  getState(): T;
  setState(update: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: Listener): () => void;
}

/**
 * Minimal immutable store. Snapshots are replaced (never mutated) so they can be consumed safely
 * by `useSyncExternalStore` without tearing.
 */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState(update) {
      const partial = typeof update === 'function' ? update(state) : update;
      let changed = false;
      for (const key in partial) {
        if (!Object.is(partial[key], state[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...partial };
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
