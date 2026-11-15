import * as React from 'react';
import { composeRefs, getElementRef } from './compose';

type AnyProps = Record<string, any>;

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps };
  for (const key in childProps) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof slotValue === 'function' &&
      typeof childValue === 'function'
    ) {
      merged[key] = (...args: unknown[]) => {
        childValue(...args);
        slotValue(...args);
      };
    } else if (key === 'style') {
      merged[key] = { ...slotValue, ...childValue };
    } else if (key === 'className') {
      merged[key] = [slotValue, childValue].filter(Boolean).join(' ');
    } else if (childValue !== undefined) {
      merged[key] = childValue;
    }
  }
  return merged;
}

/** Merges its props onto its single child element (the `asChild` pattern). */
export const Slot = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }
>(function Slot({ children, ...slotProps }, forwardedRef) {
  if (!React.isValidElement(children)) {
    return React.Children.count(children) > 1 ? React.Children.only(null) : null;
  }
  const childRef = getElementRef(children);
  return React.cloneElement(children, {
    ...mergeProps(slotProps, children.props as AnyProps),
    ref: forwardedRef ? composeRefs(forwardedRef as React.Ref<unknown>, childRef) : childRef,
  } as AnyProps);
});
