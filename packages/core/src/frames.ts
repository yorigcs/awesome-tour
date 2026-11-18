import { isBrowser } from './dom';
import type { RectLike, VirtualElement } from './types';

export type FrameInput = HTMLIFrameElement | string | (() => HTMLIFrameElement | null | undefined);

function resolveFrame(frame: FrameInput): HTMLIFrameElement | null {
  if (!isBrowser) return null;
  if (typeof frame === 'function') return frame() ?? null;
  if (typeof frame === 'string') return document.querySelector<HTMLIFrameElement>(frame);
  return frame;
}

/**
 * Point a step at an element inside a same-origin `<iframe>`:
 * `target: frameTarget('#preview', '#save-button')`.
 *
 * Returns a target that resolves lazily (so the tour waits for the frame and its content), as a
 * virtual element whose rect is the inner element's rect offset by the frame's position and borders.
 * Cross-origin frames can't be inspected: the target simply never resolves.
 */
export function frameTarget(
  frame: FrameInput,
  target: string | ((doc: Document) => Element | null | undefined),
): () => VirtualElement | null {
  return () => {
    const iframe = resolveFrame(frame);
    let doc: Document | null = null;
    try {
      doc = iframe?.contentDocument ?? null;
    } catch {
      return null; // cross-origin
    }
    if (!iframe || !doc) return null;
    const inner = typeof target === 'string' ? doc.querySelector(target) : target(doc);
    if (!inner) return null;
    return {
      contextElement: iframe,
      element: inner,
      getBoundingClientRect(): RectLike {
        const outer = iframe.getBoundingClientRect();
        const style = getComputedStyle(iframe);
        const left = outer.left + iframe.clientLeft + (Number.parseFloat(style.paddingLeft) || 0);
        const top = outer.top + iframe.clientTop + (Number.parseFloat(style.paddingTop) || 0);
        const r = inner.getBoundingClientRect();
        return {
          x: left + r.left,
          y: top + r.top,
          left: left + r.left,
          top: top + r.top,
          right: left + r.right,
          bottom: top + r.bottom,
          width: r.width,
          height: r.height,
        };
      },
    };
  };
}
