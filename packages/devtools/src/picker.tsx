import { KEEP_ATTRIBUTE, type RectLike } from '@awesome-tour/react';
import * as React from 'react';

const isUnstableId = (id: string) => /^:|:$|^[\d-]|\d{4,}|[0-9a-f]{8,}/i.test(id);
const esc = (value: string) =>
  typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
const unique = (selector: string, el: Element) => {
  try {
    const found = document.querySelectorAll(selector);
    return found.length === 1 && found[0] === el;
  } catch {
    return false;
  }
};

export interface PickedTarget {
  /** Value to paste as `target:` (a selector string, or an `anchor('…')` call). */
  target: string;
  /** How stable the suggestion is. */
  quality: 'anchor' | 'stable' | 'structural';
}

/**
 * A stable way to point a step at `el`: an existing tour anchor, a test id, a meaningful id or
 * accessible name, else the shortest unique structural path from a stable ancestor.
 */
export function suggestTarget(el: Element): PickedTarget {
  const anchorName = el.closest('[data-tour-anchor]')?.getAttribute('data-tour-anchor');
  if (anchorName) return { target: `anchor('${anchorName}')`, quality: 'anchor' };

  const own = (node: Element): string | null => {
    for (const attr of ['data-tour', 'data-testid', 'data-test', 'data-cy']) {
      const v = node.getAttribute(attr);
      if (v) {
        const s = `[${attr}="${esc(v)}"]`;
        if (unique(s, node)) return s;
      }
    }
    if (node.id && !isUnstableId(node.id) && unique(`#${esc(node.id)}`, node))
      return `#${esc(node.id)}`;
    const label = node.getAttribute('aria-label');
    const tag = node.tagName.toLowerCase();
    if (label) {
      const s = `${tag}[aria-label="${esc(label)}"]`;
      if (unique(s, node)) return s;
    }
    const name = node.getAttribute('name');
    if (name) {
      const s = `${tag}[name="${esc(name)}"]`;
      if (unique(s, node)) return s;
    }
    return null;
  };

  const direct = own(el);
  if (direct) return { target: direct, quality: 'stable' };

  // Walk up to a stable ancestor, then describe the path down with nth-of-type.
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body && parts.length < 5) {
    const base = own(node);
    if (base) {
      const selector = [base, ...parts].join(' > ');
      if (unique(selector, el)) return { target: selector, quality: 'structural' };
      break;
    }
    const tag = node.tagName.toLowerCase();
    const siblings = node.parentElement
      ? Array.from(node.parentElement.children).filter((c) => c.tagName === node!.tagName)
      : [];
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag);
    const selector = parts.join(' > ');
    if (unique(selector, el)) return { target: selector, quality: 'structural' };
    node = node.parentElement;
  }
  return { target: parts.join(' > ') || el.tagName.toLowerCase(), quality: 'structural' };
}

/** Lets the user hover and click any element of the page; Escape cancels. */
export function usePicker(active: boolean, onPick: (el: Element) => void, onCancel: () => void) {
  const [hovered, setHovered] = React.useState<RectLike | null>(null);
  const pick = React.useRef(onPick);
  const cancel = React.useRef(onCancel);
  pick.current = onPick;
  cancel.current = onCancel;

  React.useEffect(() => {
    if (!active) {
      setHovered(null);
      return;
    }
    const target = (e: Event) => {
      const el = e.composedPath().find((n): n is Element => n instanceof Element);
      if (!el || el.closest(`[${KEEP_ATTRIBUTE}]`)) return null;
      return el;
    };
    const onMove = (e: PointerEvent) => {
      const el = target(e);
      setHovered(el ? el.getBoundingClientRect() : null);
    };
    const swallow = (e: Event) => {
      if (!target(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e: MouseEvent) => {
      const el = target(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      pick.current(el);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel.current();
      }
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerdown', swallow, true);
    document.addEventListener('mousedown', swallow, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    const cursor = document.documentElement.style.cursor;
    document.documentElement.style.cursor = 'crosshair';
    return () => {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerdown', swallow, true);
      document.removeEventListener('mousedown', swallow, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      document.documentElement.style.cursor = cursor;
    };
  }, [active]);

  return hovered;
}

/** Step snippet for a picked element. */
export function stepSnippet(picked: PickedTarget) {
  const target =
    picked.quality === 'anchor' ? picked.target : `'${picked.target.replace(/'/g, "\\'")}'`;
  return `{\n  id: 'new-step',\n  target: ${target},\n  title: '',\n  description: '',\n}`;
}
