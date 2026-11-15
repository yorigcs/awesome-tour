/**
 * Framework-agnostic helpers for unit tests (Vitest, Jest) of code that uses awesome-tour.
 * For React Testing Library see `@awesome-tour/testing/react`, for Playwright `…/playwright`.
 */
import type { RouterAdapter, Tour } from '@awesome-tour/core';

export interface RectInit {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function toRect({ x = 0, y = 0, width = 0, height = 0 }: RectInit): DOMRect {
  const rect = { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height };
  return { ...rect, toJSON: () => rect } as DOMRect;
}

/**
 * Give an element a layout. jsdom has none (every rect is 0×0), so positioning, "is it in view"
 * and spotlight geometry need this. Returns a function that restores the original.
 */
export function mockRect(element: Element, rect: RectInit): () => void {
  const original = element.getBoundingClientRect;
  element.getBoundingClientRect = () => toRect(rect);
  return () => {
    element.getBoundingClientRect = original;
  };
}

/** `mockRect` for many elements at once, by selector. Returns one restore function. */
export function mockLayout(
  rects: Record<string, RectInit>,
  root: ParentNode = document,
): () => void {
  const restores = Object.entries(rects).flatMap(([selector, rect]) =>
    Array.from(root.querySelectorAll(selector)).map((el) => mockRect(el, rect)),
  );
  return () => {
    for (const restore of restores) restore();
  };
}

/** Resolves once `tour` shows `stepId` and it's ready (target resolved, scrolled). */
export function waitForStep(
  tour: Tour<any, any>,
  stepId: string,
  { timeout = 2000 }: { timeout?: number } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = () => {
      const { stepId: current, phase, status } = tour.getState();
      if (status === 'active' && current === stepId && phase === 'ready') {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      const s = tour.getState();
      reject(
        new Error(
          `[awesome-tour/testing] "${tour.id}" didn't reach step "${stepId}" within ${timeout}ms (status: ${s.status}, step: ${s.stepId}, phase: ${s.phase})`,
        ),
      );
    }, timeout);
    const unsubscribe = tour.subscribe(check);
    const cleanup = () => {
      clearTimeout(timer);
      unsubscribe();
    };
    check();
  });
}

/** Resolves once the tour is no longer on screen (completed, skipped, closed or paused). */
export function waitForTourEnd(tour: Tour<any, any>, { timeout = 2000 } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const done = () => {
      const { status } = tour.getState();
      if (
        status === 'completed' ||
        status === 'skipped' ||
        status === 'closed' ||
        status === 'paused'
      ) {
        cleanup();
        resolve(status);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`[awesome-tour/testing] "${tour.id}" is still running after ${timeout}ms`));
    }, timeout);
    const unsubscribe = tour.subscribe(done);
    const cleanup = () => {
      clearTimeout(timer);
      unsubscribe();
    };
    done();
  });
}

export interface MemoryRouter extends RouterAdapter {
  /** Every path navigated to, in order (starting with the initial one). */
  readonly history: readonly string[];
}

/** An in-memory router adapter for multi-page tours in unit tests. */
export function createMemoryRouter(initialPath = '/'): MemoryRouter {
  let path = initialPath;
  const history = [initialPath];
  const listeners = new Set<() => void>();
  return {
    get history() {
      return history;
    },
    getPath: () => path,
    navigate(next) {
      path = next;
      history.push(next);
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
