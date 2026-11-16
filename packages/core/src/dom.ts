import type { RectLike, TourTargetNode, VirtualElement } from './types';

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export function isElement(value: unknown): value is Element {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Node).nodeType === 1 &&
    typeof (value as Element).getBoundingClientRect === 'function'
  );
}

export function isVirtualElement(value: unknown): value is VirtualElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isElement(value) &&
    typeof (value as VirtualElement).getBoundingClientRect === 'function'
  );
}

export function toRect(x: number, y: number, width: number, height: number): RectLike {
  return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height };
}

export function getRect(node: TourTargetNode): RectLike {
  const r = node.getBoundingClientRect();
  return toRect(r.left, r.top, r.width, r.height);
}

/** Bounding box of several rects. */
export function unionRects(rects: readonly RectLike[]): RectLike | null {
  if (rects.length === 0) return null;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return toRect(left, top, right - left, bottom - top);
}

export function getTargetsRect(targets: readonly TourTargetNode[]): RectLike | null {
  return unionRects(targets.map(getRect));
}

export function rectsEqual(a: RectLike | null, b: RectLike | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function inflateRect(
  rect: RectLike,
  padding: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>,
): RectLike {
  const p =
    typeof padding === 'number'
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : { top: 0, right: 0, bottom: 0, left: 0, ...padding };
  return toRect(
    rect.left - p.left,
    rect.top - p.top,
    rect.width + p.left + p.right,
    rect.height + p.top + p.bottom,
  );
}

/** Wrap one or more targets as a single virtual element (union rect). */
export function createVirtualTarget(targets: readonly TourTargetNode[]): VirtualElement | null {
  if (targets.length === 0) return null;
  const first = targets[0]!;
  const contextElement = isElement(first) ? first : first.contextElement;
  return {
    getBoundingClientRect: () => getTargetsRect(targets) ?? toRect(0, 0, 0, 0),
    ...(contextElement ? { contextElement } : {}),
  };
}

export function prefersReducedMotion(): boolean {
  return isBrowser && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/* -------------------------------------------------------------------------------------------------
 * Geometry observation
 * -----------------------------------------------------------------------------------------------*/

export interface ObserveRectOptions {
  /** Poll every animation frame. Required for virtual elements whose rect changes without DOM events. */
  animationFrame?: boolean;
}

/**
 * Calls `onChange` with the union rect of `targets` whenever it changes: element resize,
 * any scroll (captured), window resize, DOM mutations, or every frame when `animationFrame` is set.
 */
export function observeRect(
  targets: readonly TourTargetNode[],
  onChange: (rect: RectLike | null) => void,
  options: ObserveRectOptions = {},
): () => void {
  if (!isBrowser) return () => {};
  const animationFrame = options.animationFrame ?? targets.some((t) => !isElement(t));
  let last: RectLike | null = null;
  let frame = 0;

  const measure = () => {
    frame = 0;
    const next = getTargetsRect(targets);
    if (!rectsEqual(last, next)) {
      last = next;
      onChange(next);
    }
    if (animationFrame) frame = requestAnimationFrame(measure);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };

  measure();
  const cleanups: (() => void)[] = [];
  if (!animationFrame) {
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    cleanups.push(() => {
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    });
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(schedule);
      for (const t of targets) if (isElement(t)) ro.observe(t);
      cleanups.push(() => ro.disconnect());
    }
    if (typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(schedule);
      mo.observe(document.body, { attributes: true, childList: true, subtree: true });
      cleanups.push(() => mo.disconnect());
    }
  }

  return () => {
    if (frame) cancelAnimationFrame(frame);
    for (const cleanup of cleanups) cleanup();
  };
}

/* -------------------------------------------------------------------------------------------------
 * Scrolling
 * -----------------------------------------------------------------------------------------------*/

/**
 * The page's `scroll-padding` (e.g. room for a sticky header): a target under it is not visible.
 * `scrollIntoView` already honours it; the visibility check has to as well.
 */
export function getScrollPadding(): { top: number; right: number; bottom: number; left: number } {
  const root = document.scrollingElement ?? document.documentElement;
  const style = getComputedStyle(root);
  const px = (value: string) => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    top: px(style.scrollPaddingTop),
    right: px(style.scrollPaddingRight),
    bottom: px(style.scrollPaddingBottom),
    left: px(style.scrollPaddingLeft),
  };
}

function isInViewport(rect: RectLike, margin = 0): boolean {
  const pad = getScrollPadding();
  return (
    rect.top >= pad.top + margin &&
    rect.left >= pad.left + margin &&
    rect.bottom <= window.innerHeight - pad.bottom - margin &&
    rect.right <= window.innerWidth - pad.right - margin
  );
}

/**
 * Scrolls the first element target into view if the targets are not fully visible, then resolves
 * once the layout has settled (two consecutive identical frames, capped at `maxWait`).
 */
export async function scrollTargetsIntoView(
  targets: readonly TourTargetNode[],
  options: ScrollIntoViewOptions = {},
  maxWait = 800,
): Promise<void> {
  if (!isBrowser) return;
  const el = targets.find(isElement);
  const rect = getTargetsRect(targets);
  if (!el || !rect || isInViewport(rect, 8)) return;
  if (typeof el.scrollIntoView !== 'function') return;
  el.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    ...options,
  });
  await waitForStableRect(targets, maxWait);
}

export function waitForStableRect(
  targets: readonly TourTargetNode[],
  maxWait = 800,
): Promise<void> {
  if (!isBrowser || typeof requestAnimationFrame === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const start = performance.now();
    let last = getTargetsRect(targets);
    let stableFrames = 0;
    const tick = () => {
      const next = getTargetsRect(targets);
      stableFrames = rectsEqual(last, next) ? stableFrames + 1 : 0;
      last = next;
      if (stableFrames >= 2 || performance.now() - start > maxWait) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* -------------------------------------------------------------------------------------------------
 * Scroll lock (ref-counted)
 * -----------------------------------------------------------------------------------------------*/

let lockCount = 0;
let restoreLock: (() => void) | null = null;

export function lockScroll(): () => void {
  if (!isBrowser) return () => {};
  if (lockCount++ === 0) {
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    restoreLock = () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lockCount === 0) {
      restoreLock?.();
      restoreLock = null;
    }
  };
}

/* -------------------------------------------------------------------------------------------------
 * Inert outside
 * -----------------------------------------------------------------------------------------------*/

const inertCounts = new WeakMap<Element, number>();

/**
 * Elements with this attribute (and their subtrees) are never made inert by modal tours and
 * their keyboard events are ignored by tour shortcuts. Use it for devtools, toasts, chat widgets.
 */
export const KEEP_ATTRIBUTE = 'data-tour-keep';

/** Whether an event originated inside a `data-tour-keep` subtree (shadow DOM aware). */
export function isFromKeptElement(event: Event): boolean {
  return event
    .composedPath()
    .some((node) => node instanceof Element && node.hasAttribute(KEEP_ATTRIBUTE));
}

/**
 * Makes everything outside `keep` inert (non-focusable, hidden from assistive tech), walking
 * from each kept element up to <body> and marking the siblings along the way. Ref-counted so
 * nested calls compose. Returns a restore function.
 */
export function inertOthers(keep: readonly Element[]): () => void {
  if (!isBrowser || keep.length === 0) return () => {};
  const keepSet = new Set<Element>();
  for (const el of keep) {
    let node: Element | null = el;
    while (node && node !== document.body) {
      keepSet.add(node);
      node = node.parentElement;
    }
  }
  const marked: Element[] = [];
  const visit = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (keep.includes(child)) continue;
      if (keepSet.has(child)) {
        visit(child);
        continue;
      }
      if (['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META'].includes(child.tagName)) continue;
      if (child.hasAttribute('aria-live') || child.hasAttribute(KEEP_ATTRIBUTE)) continue;
      const count = inertCounts.get(child) ?? 0;
      if (count === 0 && child.hasAttribute('inert')) continue; // inert by the app, leave it
      inertCounts.set(child, count + 1);
      child.setAttribute('inert', '');
      marked.push(child);
    }
  };
  visit(document.body);
  return () => {
    for (const el of marked) {
      const count = (inertCounts.get(el) ?? 1) - 1;
      if (count <= 0) {
        inertCounts.delete(el);
        el.removeAttribute('inert');
      } else inertCounts.set(el, count);
    }
  };
}
