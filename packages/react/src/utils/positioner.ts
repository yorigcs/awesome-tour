import type { VirtualElement } from '@awesome-tour/core';
import {
  arrow as arrowMiddleware,
  autoUpdate,
  flip,
  hide,
  limitShift,
  type Middleware,
  offset,
  type Placement,
  shift,
  size,
  useFloating,
} from '@floating-ui/react-dom';
import * as React from 'react';
import { useIsomorphicLayoutEffect } from './hooks';

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

export interface PositionerOptions {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionPadding?: number | Partial<Record<Side, number>>;
  arrowPadding?: number;
  /** Keep the content attached even when the target is partially out of view. */
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
  dir?: 'ltr' | 'rtl';
  /** Re-position every frame (needed for virtual targets such as 3D objects). */
  animationFrame?: boolean;
}

export interface PositionerResult {
  setFloating: (node: HTMLElement | null) => void;
  setArrow: (node: HTMLElement | null) => void;
  floatingStyles: React.CSSProperties;
  placedSide: Side;
  placedAlign: Align;
  arrowX?: number;
  arrowY?: number;
  shouldHideArrow: boolean;
  isReferenceHidden: boolean;
  isPositioned: boolean;
  transformOrigin: string;
  availableWidth?: number;
  availableHeight?: number;
  referenceWidth?: number;
  referenceHeight?: number;
}

function toPlacement(side: Side, align: Align, dir: 'ltr' | 'rtl'): Placement {
  let a = align;
  if (dir === 'rtl' && (side === 'top' || side === 'bottom')) {
    a = align === 'start' ? 'end' : align === 'end' ? 'start' : 'center';
  }
  return (a === 'center' ? side : `${side}-${a}`) as Placement;
}

function fromPlacement(placement: Placement): [Side, Align] {
  const [side, align = 'center'] = placement.split('-') as [Side, Align | undefined];
  return [side, align];
}

/** Floating UI wiring shared by tour content and hotspots. */
export function usePositioner(
  reference: VirtualElement | null,
  options: PositionerOptions & { arrowSize?: { width: number; height: number } },
): PositionerResult {
  const {
    side = 'bottom',
    align = 'center',
    sideOffset = 8,
    alignOffset = 0,
    avoidCollisions = true,
    collisionPadding = 8,
    arrowPadding = 0,
    sticky = 'partial',
    hideWhenDetached = false,
    dir = 'ltr',
    arrowSize,
    animationFrame = false,
  } = options;
  const [arrowEl, setArrow] = React.useState<HTMLElement | null>(null);
  const [sizes, setSizes] = React.useState<{
    availableWidth?: number;
    availableHeight?: number;
    referenceWidth?: number;
    referenceHeight?: number;
  }>({});
  const arrowHeight = arrowSize?.height ?? arrowEl?.offsetHeight ?? 0;
  const padding =
    typeof collisionPadding === 'number'
      ? collisionPadding
      : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPadding };

  const middleware: Middleware[] = [
    offset({ mainAxis: sideOffset + arrowHeight, alignmentAxis: alignOffset }),
    avoidCollisions &&
      shift({
        mainAxis: true,
        crossAxis: false,
        padding,
        ...(sticky === 'partial' ? { limiter: limitShift() } : {}),
      }),
    avoidCollisions && flip({ padding }),
    size({
      padding,
      apply: ({ availableWidth, availableHeight, rects }) => {
        setSizes((prev) =>
          prev.availableWidth === availableWidth &&
          prev.availableHeight === availableHeight &&
          prev.referenceWidth === rects.reference.width &&
          prev.referenceHeight === rects.reference.height
            ? prev
            : {
                availableWidth,
                availableHeight,
                referenceWidth: rects.reference.width,
                referenceHeight: rects.reference.height,
              },
        );
      },
    }),
    arrowEl && arrowMiddleware({ element: arrowEl, padding: arrowPadding }),
    hideWhenDetached && hide({ strategy: 'referenceHidden', padding }),
  ].filter(Boolean) as Middleware[];

  const { refs, floatingStyles, placement, middlewareData, isPositioned } = useFloating({
    strategy: 'fixed',
    placement: toPlacement(side, align, dir),
    middleware,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame }),
  });

  useIsomorphicLayoutEffect(() => {
    refs.setReference(reference);
  }, [reference, refs]);

  const [placedSide, placedAlign] = fromPlacement(placement);
  const arrowData = middlewareData.arrow;
  const arrowX = arrowData?.x;
  const arrowY = arrowData?.y;
  const shouldHideArrow = arrowData?.centerOffset !== 0 && arrowData?.centerOffset !== undefined;
  const ax = arrowX !== undefined ? `${arrowX + (arrowEl?.offsetWidth ?? 0) / 2}px` : '50%';
  const ay = arrowY !== undefined ? `${arrowY + (arrowEl?.offsetHeight ?? 0) / 2}px` : '50%';
  const transformOrigin = {
    top: `${ax} calc(100% + ${arrowHeight}px)`,
    bottom: `${ax} ${-arrowHeight}px`,
    left: `calc(100% + ${arrowHeight}px) ${ay}`,
    right: `${-arrowHeight}px ${ay}`,
  }[placedSide];

  return {
    setFloating: refs.setFloating,
    setArrow,
    floatingStyles,
    placedSide,
    placedAlign,
    arrowX,
    arrowY,
    shouldHideArrow,
    isReferenceHidden: !!middlewareData.hide?.referenceHidden,
    isPositioned,
    transformOrigin,
    ...sizes,
  };
}
