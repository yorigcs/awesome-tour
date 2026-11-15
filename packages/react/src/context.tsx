import {
  type AnchorRegistry,
  createTourManager,
  defaultAnchors,
  type RouterAdapter,
  type StepDefinition,
  type Tour,
  type TourManager,
  type TourState,
} from '@awesome-tour/core';
import * as React from 'react';
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
  children,
}: TourProviderProps) {
  // Register initial tours synchronously so children can look them up on the first render.
  const [internal] = React.useState(() => managerProp ?? createTourManager({ router, tours }));
  const manager = managerProp ?? internal;

  React.useEffect(() => {
    manager.setRouter(router);
  }, [manager, router]);

  React.useEffect(() => {
    const cleanups = (tours ?? []).map((tour) => manager.register(tour));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [manager, tours]);

  const value = React.useMemo(
    () => ({ manager, anchors: anchors ?? defaultAnchors }),
    [manager, anchors],
  );
  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
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
  keyboardNavigation: boolean;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;
  contentId: string;
  contents: ContentStore;
  registerStep(step: () => ReactStepDefinition): () => void;
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
