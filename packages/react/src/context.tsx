import {
  type AnchorRegistry,
  createTourManager,
  type DeepLinkOptions,
  deepLink,
  defaultAnchors,
  type ImpressionRecord,
  type PersistenceAdapter,
  type RouterAdapter,
  type StepDefinition,
  type Tour,
  type TourManager,
  type TourState,
} from '@awesome-tour/core';
import * as React from 'react';
import { MessagesScope, type TourMessagesInput } from './messages';
import type { Align, Side } from './utils/positioner';

/* -------------------------------------------------------------------------------------------------
 * Step definition for React
 * -----------------------------------------------------------------------------------------------*/

export interface StepRenderProps {
  tour: Tour<any, any>;
  state: TourState;
  step: ReactStepDefinition;
}

export interface ReactStepDefinition<TData = any, TId extends string = string>
  extends StepDefinition<TData, TId> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode | ((props: StepRenderProps) => React.ReactNode);
  /** Preferred side of the target for this step (overrides `Tour.Content` `side`). */
  side?: Side;
  /** Preferred alignment for this step (overrides `Tour.Content` `align`). */
  align?: Align;
  /** Let the user click/type into the highlighted target. Defaults to true when `advanceOn.event` is set. */
  interactive?: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface ProviderContextValue {
  manager: TourManager;
  anchors: AnchorRegistry;
}

const ProviderContext = React.createContext<ProviderContextValue | null>(null);

export interface TourProviderProps {
  /** Tours to register with the provider's manager (startable by id). */
  tours?: Tour<any, any>[];
  /** Router adapter for multi-page tours. */
  router?: RouterAdapter;
  /** Anchor registry used by `useTourAnchor`. Default: the global registry. */
  anchors?: AnchorRegistry;
  /** Bring your own manager (e.g. created outside React). */
  manager?: TourManager;
  /**
   * Where the manager remembers impressions for display `rules` (shows, outcome, snooze).
   * Read once. Default: in memory. Ignored when you pass `manager`.
   */
  impressions?: PersistenceAdapter<ImpressionRecord>;
  /** Translations for every string the primitives render (merged over the English defaults). */
  messages?: TourMessagesInput;
  /**
   * Start the tour named in the URL (`?tour=id&step=x`) once it's registered, then remove the
   * parameters. `true` uses the defaults; pass options to rename them. Default: off.
   */
  deepLink?: boolean | DeepLinkOptions;
  children?: React.ReactNode;
}

/**
 * Optional app-level provider: coordinates several tours (one on screen at a time, others queued),
 * shares a router adapter and the anchor registry.
 */
export function TourProvider({
  tours,
  router,
  anchors,
  manager: managerProp,
  impressions,
  messages,
  deepLink: deepLinkOption,
  children,
}: TourProviderProps) {
  // Initial tours are registered synchronously so children can look them up on the first render;
  // the manager only starts watching (triggers, router, impressions) once mounted, so a render
  // StrictMode throws away leaves nothing running.
  const [internal] = React.useState(() =>
    managerProp
      ? null
      : createTourManager({
          router,
          tours,
          connect: false,
          ...(impressions ? { impressions } : {}),
        }),
  );
  const manager = managerProp ?? internal!;

  React.useEffect(() => {
    if (!internal) return;
    return internal.connect();
  }, [internal]);

  React.useEffect(() => {
    manager.setRouter(router);
  }, [manager, router]);

  const deepLinkOptions = React.useRef(deepLinkOption);
  React.useEffect(() => {
    const value = deepLinkOptions.current;
    if (!value) return;
    return deepLink(manager, value === true ? {} : value);
  }, [manager]);

  // An inline `tours={[a, b]}` array is new on every render: only re-register when its tours change.
  const stableTours = useShallowStable(tours);
  React.useEffect(() => {
    const cleanups = (stableTours ?? []).map((tour) => manager.register(tour));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [manager, stableTours]);

  const value = React.useMemo(
    () => ({ manager, anchors: anchors ?? defaultAnchors }),
    [manager, anchors],
  );
  return (
    <ProviderContext.Provider value={value}>
      <MessagesScope messages={messages}>{children}</MessagesScope>
    </ProviderContext.Provider>
  );
}

/** Returns the previous array while its items are the same (by identity). */
function useShallowStable<T>(value: readonly T[] | undefined): readonly T[] | undefined {
  const ref = React.useRef(value);
  const prev = ref.current;
  const same =
    prev === value ||
    (!!prev &&
      !!value &&
      prev.length === value.length &&
      prev.every((item, i) => Object.is(item, value[i])));
  if (!same) ref.current = value;
  return same ? prev : value;
}

export function useTourProvider(): ProviderContextValue | null {
  return React.useContext(ProviderContext);
}

/** The tour manager from the nearest `TourProvider`. */
export function useTourManager(): TourManager {
  const ctx = React.useContext(ProviderContext);
  if (!ctx) throw new Error('[awesome-tour] `useTourManager` must be used within <TourProvider>');
  return ctx.manager;
}

/* -------------------------------------------------------------------------------------------------
 * Root context
 * -----------------------------------------------------------------------------------------------*/

export interface ContentStore {
  get(id: string): React.ReactNode | undefined;
  set(id: string, node: React.ReactNode): void;
  delete(id: string): void;
  subscribe(listener: () => void): () => void;
}

export function createContentStore(): ContentStore {
  const map = new Map<string, React.ReactNode>();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of [...listeners]) l();
  };
  return {
    get: (id) => map.get(id),
    set: (id, node) => {
      map.set(id, node);
      notify();
    },
    delete: (id) => {
      map.delete(id);
      notify();
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** Keys (`KeyboardEvent.key`) per action. `next`/`prev` are mirrored in RTL. */
export interface TourKeyMap {
  next: readonly string[];
  prev: readonly string[];
  first: readonly string[];
  last: readonly string[];
}

export const defaultKeyMap: TourKeyMap = {
  next: ['ArrowRight'],
  prev: ['ArrowLeft'],
  first: ['Home'],
  last: ['End'],
};

export interface TourContextValue {
  tour: Tour<any, any>;
  state: TourState;
  /** Whether tour UI should be on screen. */
  open: boolean;
  step: ReactStepDefinition | undefined;
  modal: boolean;
  /** Whether the user can interact with the highlighted target. */
  interactive: boolean;
  dir: 'ltr' | 'rtl';
  /** Keys that drive the tour, or `null` when keyboard navigation is off. */
  keyMap: TourKeyMap | null;
  /** Morph between steps with the View Transitions API. */
  viewTransition: boolean;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;
  contentId: string;
  contents: ContentStore;
  registerStep(step: () => ReactStepDefinition): () => void;
  /** Push the latest declarative step definitions to the tour. */
  syncSteps(): void;
  /** Elements that must stay interactive while the modal tour is open (overlay, spotlight…). */
  registerLayer(element: HTMLElement): () => void;
  layers: ReadonlySet<HTMLElement>;
  layersVersion: number;
}

export const TourContext = React.createContext<TourContextValue | null>(null);

export function useTourContext(component = 'This component'): TourContextValue {
  const ctx = React.useContext(TourContext);
  if (!ctx) throw new Error(`[awesome-tour] ${component} must be used within <Tour.Root>`);
  return ctx;
}
