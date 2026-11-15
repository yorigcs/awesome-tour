import type { AnchorTarget, Listener, TourTargetNode } from './types';

/**
 * Registry of named targets. Components register themselves under a stable id (e.g. via
 * `useTourAnchor('create-button')`) so tours never depend on brittle CSS selectors.
 */
export interface AnchorRegistry {
  register(id: string, node: TourTargetNode): () => void;
  get(id: string): TourTargetNode[];
  subscribe(listener: Listener): () => void;
}

export function createAnchorRegistry(): AnchorRegistry {
  const anchors = new Map<string, Set<TourTargetNode>>();
  const listeners = new Set<Listener>();
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  return {
    register(id, node) {
      let set = anchors.get(id);
      if (!set) {
        set = new Set();
        anchors.set(id, set);
      }
      set.add(node);
      notify();
      return () => {
        const current = anchors.get(id);
        if (!current) return;
        current.delete(node);
        if (current.size === 0) anchors.delete(id);
        notify();
      };
    },
    get(id) {
      return [...(anchors.get(id) ?? [])];
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Process-wide default registry, used when no registry is passed explicitly. */
export const defaultAnchors: AnchorRegistry = createAnchorRegistry();

/** Reference a registered anchor as a step target. */
export function anchor(id: string): AnchorTarget {
  return { __tourAnchor: id };
}

export function isAnchorTarget(value: unknown): value is AnchorTarget {
  return typeof value === 'object' && value !== null && '__tourAnchor' in value;
}
