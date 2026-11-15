export interface Emitter<TEvents extends object> {
  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): () => void;
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
  clear(): void;
}

export function createEmitter<TEvents extends object>(
  onError?: (error: unknown) => void,
): Emitter<TEvents> {
  const handlers = new Map<keyof TEvents, Set<(payload: any) => void>>();

  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler);
      return () => {
        set.delete(handler);
      };
    },
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      for (const handler of [...set]) {
        try {
          handler(payload);
        } catch (error) {
          if (onError) onError(error);
          else throw error;
        }
      }
    },
    clear() {
      handlers.clear();
    },
  };
}
