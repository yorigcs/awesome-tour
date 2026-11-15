import * as React from 'react';
import { getElementRef, useComposedRefs } from './compose';
import { useIsomorphicLayoutEffect } from './hooks';

function getAnimationName(node: HTMLElement | null) {
  return node ? getComputedStyle(node).animationName || 'none' : 'none';
}

/**
 * Keeps its child mounted until a CSS exit animation (triggered by `data-state="closed"`) ends.
 * Same contract as Radix: animate with `[data-state=closed] { animation: … }`.
 */
export function usePresence(present: boolean) {
  const [node, setNode] = React.useState<HTMLElement | null>(null);
  const [state, setState] = React.useState<'mounted' | 'unmountSuspended' | 'unmounted'>(
    present ? 'mounted' : 'unmounted',
  );
  const openAnimation = React.useRef('none');
  const prevPresent = React.useRef(present);

  useIsomorphicLayoutEffect(() => {
    if (prevPresent.current === present) return;
    prevPresent.current = present;
    if (present) {
      setState('mounted');
      return;
    }
    const current = getAnimationName(node);
    const display = node ? getComputedStyle(node).display : 'none';
    if (!node || current === 'none' || display === 'none' || current === openAnimation.current) {
      setState('unmounted');
    } else {
      setState('unmountSuspended');
    }
  }, [present, node]);

  useIsomorphicLayoutEffect(() => {
    if (!node) return;
    const onStart = (event: AnimationEvent) => {
      if (event.target === node && present) openAnimation.current = event.animationName;
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target === node && !prevPresent.current) setState('unmounted');
    };
    node.addEventListener('animationstart', onStart);
    node.addEventListener('animationend', onEnd);
    node.addEventListener('animationcancel', onEnd);
    return () => {
      node.removeEventListener('animationstart', onStart);
      node.removeEventListener('animationend', onEnd);
      node.removeEventListener('animationcancel', onEnd);
    };
  }, [node, present]);

  return {
    isPresent: present || state === 'unmountSuspended',
    ref: React.useCallback((el: HTMLElement | null) => setNode(el), []),
  };
}

export function Presence({
  present,
  children,
}: {
  present: boolean;
  children: React.ReactElement;
}) {
  const presence = usePresence(present);
  const ref = useComposedRefs(presence.ref, getElementRef(children) as React.Ref<HTMLElement>);
  return presence.isPresent
    ? React.cloneElement(children, { ref } as Record<string, unknown>)
    : null;
}
