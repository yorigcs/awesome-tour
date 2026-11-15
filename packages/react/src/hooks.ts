import {
  type AnchorRegistry,
  defaultAnchors,
  isElement,
  observeRect,
  type RectLike,
  type Tour,
  type TourEvents,
  type TourState,
} from '@awesome-tour/core';
import * as React from 'react';
import { type ReactStepDefinition, TourContext, useTourContext, useTourProvider } from './context';
import { useCallbackRef, useIsomorphicLayoutEffect } from './utils/hooks';

const identity = <T>(x: T) => x;

export interface ExternalStore<TState> {
  subscribe(listener: () => void): () => void;
  getState(): TState;
}

/**
 * Subscribe to any `{ subscribe, getState }` store (tours, checklists, the tour manager) with a
 * selector. Concurrent-safe (`useSyncExternalStore`): re-renders only when the selection changes.
 */
export function useStoreSelector<TState, TSelected = TState>(
  store: ExternalStore<TState>,
  selector: (state: TState) => TSelected = identity as (state: TState) => TSelected,
  isEqual: (a: TSelected, b: TSelected) => boolean = Object.is,
): TSelected {
  const cache = React.useRef<{ snapshot: TState; selected: TSelected } | null>(null);
  const selectorRef = React.useRef(selector);
  const isEqualRef = React.useRef(isEqual);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const getSelection = React.useCallback(() => {
    const snapshot = store.getState();
    const prev = cache.current;
    if (prev && prev.snapshot === snapshot) return prev.selected;
    const selected = selectorRef.current(snapshot);
    if (prev && isEqualRef.current(prev.selected, selected)) {
      cache.current = { snapshot, selected: prev.selected };
      return prev.selected;
    }
    cache.current = { snapshot, selected };
    return selected;
  }, [store]);

  // Reset cache when the selector identity changes so a new selector is applied immediately.
  // biome-ignore lint/correctness/useExhaustiveDependencies: selector identity is the trigger
  React.useMemo(() => {
    cache.current = null;
  }, [selector, store]);

  return React.useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

/** `useStoreSelector` for tours. */
export function useTourSelector<TState extends TourState, TSelected = TState>(
  tour: Pick<Tour<any, any>, 'subscribe' | 'getState'>,
  selector?: (state: TState) => TSelected,
  isEqual?: (a: TSelected, b: TSelected) => boolean,
): TSelected {
  return useStoreSelector(tour as ExternalStore<TState>, selector, isEqual);
}

/** Select from the state of the tour of the nearest `Tour.Root`. */
export function useTourState<TSelected = TourState>(
  selector?: (state: TourState) => TSelected,
  isEqual?: (a: TSelected, b: TSelected) => boolean,
): TSelected {
  const { tour } = useTourContext('useTourState');
  return useTourSelector(tour, selector as (s: TourState) => TSelected, isEqual);
}

export interface UseTourResult<TData = any> {
  tour: Tour<any, TData>;
  start: Tour<any, TData>['start'];
  next: () => Promise<void>;
  prev: () => Promise<void>;
  goTo: (id: string) => Promise<void>;
  complete: () => void;
  skip: () => void;
  close: () => void;
  pause: () => void;
  resume: () => Promise<void>;
  restart: () => Promise<void>;
  setData: Tour<any, TData>['setData'];
  signal: (name: string) => void;
}

/**
 * Imperative controls for a tour: the nearest `Tour.Root`'s, a tour instance, or a tour id
 * registered on the `TourProvider`.
 */
export function useTour<TData = any>(tourOrId?: Tour<any, TData> | string): UseTourResult<TData> {
  const root = React.useContext(TourContext);
  const provider = useTourProvider();
  let tour: Tour<any, TData> | undefined;
  if (typeof tourOrId === 'string') tour = provider?.manager.get(tourOrId);
  else tour = tourOrId ?? (root?.tour as Tour<any, TData> | undefined);
  if (!tour) {
    throw new Error(
      typeof tourOrId === 'string'
        ? `[awesome-tour] No tour "${tourOrId}" registered on <TourProvider>`
        : '[awesome-tour] `useTour()` must be used within <Tour.Root> or be given a tour',
    );
  }
  const t = tour;
  return React.useMemo(
    () => ({
      tour: t,
      start: t.start,
      next: t.next,
      prev: t.prev,
      goTo: (id: string) => t.goTo(id),
      complete: t.complete,
      skip: t.skip,
      close: t.close,
      pause: t.pause,
      resume: t.resume,
      restart: t.restart,
      setData: t.setData,
      signal: t.signal,
    }),
    [t],
  );
}

/** Current step of the nearest `Tour.Root`, with handy derived values. */
export function useTourStep<TStep extends ReactStepDefinition = ReactStepDefinition>() {
  const ctx = useTourContext('useTourStep');
  const { state } = ctx;
  return {
    step: ctx.step as TStep | undefined,
    stepId: state.stepId,
    index: state.progress.current - 1,
    progress: state.progress,
    isFirst: state.progress.current <= 1 && state.history.length <= 1,
    isLast: state.progress.current >= state.progress.total,
    targets: state.targets,
    targetMissing: state.targetMissing,
    phase: state.phase,
  };
}

/** Subscribe to a tour event. The handler can change between renders without resubscribing. */
export function useTourEvent<K extends keyof TourEvents>(
  event: K,
  handler: (payload: TourEvents[K]) => void,
  tour?: Tour<any, any>,
) {
  const root = React.useContext(TourContext);
  const target = tour ?? root?.tour;
  const stable = useCallbackRef(handler);
  React.useEffect(() => target?.on(event, stable), [target, event, stable]);
}

/**
 * Register an element as a named tour target. Use with `anchor(id)` in step definitions so tours
 * don't depend on CSS selectors.
 *
 * @example
 * const ref = useTourAnchor('create-button');
 * return <button ref={ref}>Create</button>;
 */
export function useTourAnchor<T extends Element = HTMLElement>(
  id: string,
  registry?: AnchorRegistry,
): React.RefCallback<T> {
  const provider = useTourProvider();
  const anchors = registry ?? provider?.anchors ?? defaultAnchors;
  const cleanup = React.useRef<(() => void) | null>(null);
  return React.useCallback(
    (node: T | null) => {
      cleanup.current?.();
      cleanup.current = node ? anchors.register(id, node) : null;
    },
    [anchors, id],
  );
}

/** Live viewport rect (union) of the current step's targets. `null` for centered steps. */
export function useTargetRect(): RectLike | null {
  const { state } = useTourContext('useTargetRect');
  const [rect, setRect] = React.useState<RectLike | null>(null);
  const targets = state.targets;
  useIsomorphicLayoutEffect(() => {
    if (targets.length === 0) {
      setRect(null);
      return;
    }
    return observeRect(targets, setRect, { animationFrame: targets.some((t) => !isElement(t)) });
  }, [targets]);
  return rect;
}
