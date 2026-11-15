import * as React from 'react';

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === 'function') return ref(value);
  if (ref !== null && ref !== undefined) (ref as React.MutableRefObject<T>).current = value;
}

export function composeRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (typeof cleanup === 'function') hasCleanup = true;
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        cleanups.forEach((cleanup, i) => {
          if (typeof cleanup === 'function') cleanup();
          else setRef(refs[i], null as T);
        });
      };
    }
    return undefined;
  };
}

export function useComposedRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are the dependencies
  return React.useCallback(composeRefs(...refs), refs);
}

/** Calls the user's handler first; ours runs unless they called `event.preventDefault()`. */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  user: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    user?.(event);
    if (!event.defaultPrevented) ours(event);
  };
}

/** Reads a child element's ref in both React 18 (`element.ref`) and 19 (`props.ref`). */
export function getElementRef(element: React.ReactElement): React.Ref<unknown> | undefined {
  const props = element.props as { ref?: React.Ref<unknown> };
  // React 19
  let getter = Object.getOwnPropertyDescriptor(props, 'ref')?.get;
  let warns = getter && 'isReactWarning' in getter && getter.isReactWarning;
  if (warns) return (element as unknown as { ref: React.Ref<unknown> }).ref;
  // React 18
  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get;
  warns = getter && 'isReactWarning' in getter && getter.isReactWarning;
  if (warns) return props.ref;
  return props.ref ?? (element as unknown as { ref?: React.Ref<unknown> }).ref;
}
