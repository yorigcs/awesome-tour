import { type AnchorRegistry, isAnchorTarget } from './anchors';
import {
  isBrowser,
  isElement,
  isTargetConnected,
  isVirtualElement,
  observeShadowRoot,
  subscribeDomActivity,
  subscribeTicker,
} from './dom';
import type { FallbackTarget, TargetInput, TourTargetNode } from './types';

/**
 * querySelectorAll that also pierces open shadow roots. Light DOM matches win; otherwise matches
 * from every open shadow root (nested ones included) are returned, and those roots are watched for
 * mutations from then on.
 */
export function deepQuerySelectorAll(selector: string, root: ParentNode = document): Element[] {
  const results = Array.from(root.querySelectorAll(selector));
  if (results.length > 0) return results;
  const found: Element[] = [];
  const walk = (node: ParentNode) => {
    for (const el of Array.from(node.querySelectorAll('*'))) {
      const shadow = (el as Element).shadowRoot;
      if (!shadow) continue;
      const matches = shadow.querySelectorAll(selector);
      if (matches.length > 0) {
        observeShadowRoot(shadow);
        found.push(...Array.from(matches));
      }
      walk(shadow);
    }
  };
  walk(root);
  return found;
}

function isFallbackTarget(value: unknown): value is FallbackTarget {
  return typeof value === 'object' && value !== null && '__tourFirstOf' in value;
}

/** Resolve a target description into concrete nodes (synchronously). */
export function resolveTarget(
  input: TargetInput | null | undefined,
  anchors: AnchorRegistry,
): TourTargetNode[] {
  if (input == null) return [];
  if (typeof input === 'string') {
    if (!isBrowser) return [];
    try {
      return deepQuerySelectorAll(input);
    } catch {
      return [];
    }
  }
  if (typeof input === 'function') return resolveTarget(input(), anchors);
  if (Array.isArray(input)) {
    const out: TourTargetNode[] = [];
    for (const item of input as readonly TargetInput[]) {
      for (const node of resolveTarget(item, anchors)) if (!out.includes(node)) out.push(node);
    }
    return out;
  }
  if (isFallbackTarget(input)) {
    for (const candidate of input.__tourFirstOf) {
      const nodes = resolveTarget(candidate, anchors);
      if (nodes.length > 0) return nodes;
    }
    return [];
  }
  if (isElement(input)) return input.isConnected ? [input] : [];
  if (isAnchorTarget(input)) return anchors.get(input.__tourAnchor).filter(isTargetConnected);
  if (isVirtualElement(input)) return [input];
  if (typeof input === 'object' && 'current' in input) {
    const current = input.current;
    return current && isElement(current) && current.isConnected ? [current] : [];
  }
  return [];
}

/** Whether the target description refers to multiple items and all must be present. */
function expectedCount(input: TargetInput): number {
  return Array.isArray(input) ? input.length : 1;
}

export interface WaitForTargetOptions {
  anchors: AnchorRegistry;
  timeout: number;
  signal?: AbortSignal;
}

/**
 * Resolve the target, waiting for it to appear in the DOM (or be registered as an anchor) for up
 * to `timeout` ms. Resolves `[]` on timeout. For arrays, resolves when at least one item is
 * present at timeout, or immediately when all are present.
 */
export function waitForTarget(
  input: TargetInput,
  { anchors, timeout, signal }: WaitForTargetOptions,
): Promise<TourTargetNode[]> {
  const expected = expectedCount(input);
  const initial = resolveTarget(input, anchors);
  if (initial.length >= expected || timeout <= 0 || !isBrowser) return Promise.resolve(initial);

  return new Promise((resolve, reject) => {
    let done = false;
    const cleanups: (() => void)[] = [];
    const finish = (value: TourTargetNode[]) => {
      if (done) return;
      done = true;
      for (const cleanup of cleanups) cleanup();
      resolve(value);
    };
    const check = () => {
      const nodes = resolveTarget(input, anchors);
      if (nodes.length >= expected) finish(nodes);
    };

    cleanups.push(subscribeDomActivity(check));
    cleanups.push(anchors.subscribe(check));
    // Function / ref targets may change without DOM mutations.
    cleanups.push(subscribeTicker(100, check));
    const timer = setTimeout(() => finish(resolveTarget(input, anchors)), timeout);
    cleanups.push(() => clearTimeout(timer));

    if (signal) {
      const onAbort = () => {
        if (done) return;
        done = true;
        for (const cleanup of cleanups) cleanup();
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      if (signal.aborted) onAbort();
      else {
        signal.addEventListener('abort', onAbort, { once: true });
        cleanups.push(() => signal.removeEventListener('abort', onAbort));
      }
    }
  });
}
