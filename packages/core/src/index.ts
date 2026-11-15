export type { AnchorRegistry } from './anchors';
export { anchor, createAnchorRegistry, defaultAnchors, isAnchorTarget } from './anchors';
export type { ObserveRectOptions } from './dom';
export {
  createVirtualTarget,
  getRect,
  getTargetsRect,
  inertOthers,
  inflateRect,
  isBrowser,
  isElement,
  isVirtualElement,
  lockScroll,
  observeRect,
  prefersReducedMotion,
  rectsEqual,
  scrollTargetsIntoView,
  toRect,
  unionRects,
  waitForStableRect,
} from './dom';
export type { Emitter } from './emitter';
export { createEmitter } from './emitter';
export type { QueueOptions, TourManager, TourManagerState } from './manager';
export { createTourManager } from './manager';
export type { PersistedTourState, PersistenceAdapter, PersistOptions } from './persistence';
export { localStorageAdapter, memoryStorage, persist, readTourProgress } from './persistence';
export { createBrowserRouter, matchRoute } from './router';
export type { Store } from './store';
export { createStore } from './store';
export type { WaitForTargetOptions } from './targets';
export { deepQuerySelectorAll, resolveTarget, waitForTarget } from './targets';
export { createTour } from './tour';
export type * from './types';
