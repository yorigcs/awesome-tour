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

/** Tabbable elements in DOM order, descending into open shadow roots (web components). */
export function getTabbables(container: HTMLElement | ShadowRoot): HTMLElement[] {
  const out: HTMLElement[] = [];
  const visit = (root: HTMLElement | ShadowRoot) => {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(`${TABBABLE},*`))) {
      const tabbable =
        el.matches(TABBABLE) &&
        !el.hasAttribute('inert') &&
        el.getAttribute('aria-hidden') !== 'true';
      if (tabbable) out.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(container);
  return out;
}

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Composite widgets that own arrow keys (and Home/End): tour shortcuts must not steal them. */
const KEY_OWNING_ROLES = new Set([
  'slider',
  'spinbutton',
  'listbox',
  'option',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'grid',
  'gridcell',
  'treegrid',
  'tree',
  'treeitem',
  'tablist',
  'tab',
  'radiogroup',
  'radio',
  'combobox',
  'toolbar',
]);

/**
 * Whether a key event belongs to the focused element rather than to the tour: text fields,
 * composite ARIA widgets (sliders, menus, grids, tabs…), media, and anything inside
 * `[data-tour-keys="ignore"]`.
 */
export function ownsKeys(event: Event): boolean {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.getAttribute('data-tour-keys') === 'ignore') return true;
    if (node.hasAttribute('data-tour-keys')) return false; // explicit opt back in
    if (isEditable(node)) return true;
    const role = node.getAttribute('role');
    if (role && KEY_OWNING_ROLES.has(role)) return true;
    if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') return true;
    if (node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'range') return true;
  }
  return false;
}

/* -------------------------------------------------------------------------------------------------
 * Keyboard ownership: when several tours/hints are open, only the most recent handles keys.
 * -----------------------------------------------------------------------------------------------*/

const keyboardStack: object[] = [];

/** Registers `owner` as the newest keyboard owner while `active`. Returns `isTop()`. */
export function useKeyboardOwner(active: boolean): () => boolean {
  const owner = React.useMemo(() => ({}), []);
  React.useEffect(() => {
    if (!active) return;
    keyboardStack.push(owner);
    return () => {
      const i = keyboardStack.lastIndexOf(owner);
      if (i >= 0) keyboardStack.splice(i, 1);
    };
  }, [active, owner]);
  return React.useCallback(
    () => keyboardStack.length === 0 || keyboardStack[keyboardStack.length - 1] === owner,
    [owner],
  );
}
