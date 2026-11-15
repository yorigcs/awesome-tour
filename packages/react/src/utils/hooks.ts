import * as React from 'react';

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/** Stable function identity that always calls the latest callback. */
export function useCallbackRef<T extends (...args: any[]) => any>(callback: T | undefined): T {
  const ref = React.useRef(callback);
  useIsomorphicLayoutEffect(() => {
    ref.current = callback;
  });
  return React.useMemo(() => ((...args: any[]) => ref.current?.(...args)) as T, []);
}

export function useIsMounted() {
  const [mounted, setMounted] = React.useState(false);
  useIsomorphicLayoutEffect(() => setMounted(true), []);
  return mounted;
}

export const visuallyHidden: React.CSSProperties = {
  position: 'absolute',
  border: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  wordWrap: 'normal',
};

const TABBABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export function getTabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
