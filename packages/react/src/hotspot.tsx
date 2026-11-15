import {
  createVirtualTarget,
  defaultAnchors,
  resolveTarget,
  type TargetInput,
  type TourTargetNode,
} from '@awesome-tour/core';
import * as React from 'react';
import { useTourProvider } from './context';
import { Portal } from './tour';
import { composeEventHandlers, useComposedRefs } from './utils/compose';
import { useCallbackRef, useIsomorphicLayoutEffect } from './utils/hooks';
import { type PositionerOptions, usePositioner } from './utils/positioner';
import { Presence } from './utils/presence';
import { Primitive, type PrimitiveProps } from './utils/primitive';

/** Resolve a target and keep it in sync with DOM changes and anchor registrations. */
export function useResolvedTarget(target: TargetInput | null | undefined): TourTargetNode[] {
  const provider = useTourProvider();
  const anchors = provider?.anchors ?? defaultAnchors;
  const [nodes, setNodes] = React.useState<TourTargetNode[]>([]);
  const targetRef = React.useRef(target);
  targetRef.current = target;
  useIsomorphicLayoutEffect(() => {
    const update = () => {
      const next = resolveTarget(targetRef.current, anchors);
      setNodes((prev) =>
        prev.length === next.length && prev.every((n, i) => n === next[i]) ? prev : next,
      );
    };
    update();
    const unsubscribe = anchors.subscribe(update);
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(update) : null;
    mo?.observe(document.body, { childList: true, subtree: true });
    return () => {
      unsubscribe();
      mo?.disconnect();
    };
  }, [anchors, typeof target === 'string' ? target : target]);
  return nodes;
}

/* -----------------------------------------------------------------------------------------------*/

interface HotspotContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  targets: TourTargetNode[];
  beacon: HTMLElement | null;
  setBeacon: (el: HTMLElement | null) => void;
  contentId: string;
}

const HotspotContext = React.createContext<HotspotContextValue | null>(null);
function useHotspot(name: string) {
  const ctx = React.useContext(HotspotContext);
  if (!ctx) throw new Error(`[awesome-tour] ${name} must be used within <Hotspot.Root>`);
  return ctx;
}

export interface HotspotRootProps {
  /** What the hotspot points at. */
  target: TargetInput;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

/**
 * A non-blocking hint attached to an element: a beacon the user can open to reveal content.
 * Great for contextual tips or as an entry point to a full tour.
 */
function HotspotRoot({
  target,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: HotspotRootProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const handleChange = useCallbackRef(onOpenChange);
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      handleChange(next);
    },
    [openProp, handleChange],
  );
  const targets = useResolvedTarget(target);
  const [beacon, setBeacon] = React.useState<HTMLElement | null>(null);
  const id = React.useId().replace(/:/g, '');
  return (
    <HotspotContext.Provider
      value={{ open, setOpen, targets, beacon, setBeacon, contentId: `hotspot${id}` }}
    >
      {children}
    </HotspotContext.Provider>
  );
}

export interface HotspotBeaconProps
  extends PrimitiveProps<'button'>,
    Omit<PositionerOptions, 'dir'> {}

/** The pulsing dot. Positioned relative to the target (default: top-end corner, overlapping). */
const HotspotBeacon = React.forwardRef<HTMLButtonElement, HotspotBeaconProps>(
  function HotspotBeacon(
    {
      side = 'top',
      align = 'end',
      sideOffset = -8,
      alignOffset = -8,
      avoidCollisions = false,
      collisionPadding,
      sticky,
      hideWhenDetached = true,
      animationFrame,
      onClick,
      style,
      ...props
    },
    ref,
  ) {
    const ctx = useHotspot('<Hotspot.Beacon>');
    const reference = React.useMemo(() => createVirtualTarget(ctx.targets), [ctx.targets]);
    const positioner = usePositioner(reference, {
      side,
      align,
      sideOffset,
      alignOffset,
      avoidCollisions,
      collisionPadding,
      sticky,
      hideWhenDetached,
      animationFrame,
    });
    const composed = useComposedRefs<HTMLButtonElement>(
      ref,
      positioner.setFloating as React.Ref<HTMLButtonElement>,
      ctx.setBeacon as React.Ref<HTMLButtonElement>,
    );
    if (!reference) return null;
    return (
      <Primitive.button
        type="button"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.contentId : undefined}
        aria-haspopup="dialog"
        aria-label={props.children ? undefined : 'Show hint'}
        data-state={ctx.open ? 'open' : 'closed'}
        data-tour-beacon=""
        {...props}
        ref={composed}
        style={{
          ...positioner.floatingStyles,
          visibility: positioner.isReferenceHidden ? 'hidden' : undefined,
          ...style,
        }}
        onClick={composeEventHandlers(onClick, () => ctx.setOpen(!ctx.open))}
      />
    );
  },
);

export interface HotspotContentProps extends PrimitiveProps<'div'>, Omit<PositionerOptions, 'dir'> {
  forceMount?: boolean;
}

const HotspotContent = React.forwardRef<HTMLDivElement, HotspotContentProps>(
  function HotspotContent({ forceMount, ...props }, ref) {
    const ctx = useHotspot('<Hotspot.Content>');
    return (
      <Presence present={forceMount || ctx.open}>
        <HotspotContentImpl {...props} ref={ref} />
      </Presence>
    );
  },
);

const HotspotContentImpl = React.forwardRef<
  HTMLDivElement,
  Omit<HotspotContentProps, 'forceMount'>
>(function HotspotContentImpl(
  {
    side = 'bottom',
    align = 'center',
    sideOffset = 8,
    alignOffset,
    avoidCollisions,
    collisionPadding,
    sticky,
    hideWhenDetached,
    animationFrame,
    style,
    ...props
  },
  ref,
) {
  const ctx = useHotspot('<Hotspot.Content>');
  const reference = React.useMemo(() => createVirtualTarget(ctx.targets), [ctx.targets]);
  const positioner = usePositioner(reference, {
    side,
    align,
    sideOffset,
    alignOffset,
    avoidCollisions,
    collisionPadding,
    sticky,
    hideWhenDetached,
    animationFrame,
  });
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const composed = useComposedRefs<HTMLDivElement>(
    ref,
    setNode,
    positioner.setFloating as React.Ref<HTMLDivElement>,
  );

  React.useEffect(() => {
    if (!ctx.open || !node) return;
    node.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx.setOpen(false);
        ctx.beacon?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!node.contains(t) && !ctx.beacon?.contains(t)) ctx.setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [ctx.open, node, ctx.setOpen, ctx.beacon]);

  if (!reference) return null;
  return (
    <Primitive.div
      role="dialog"
      id={ctx.contentId}
      tabIndex={-1}
      data-state={ctx.open ? 'open' : 'closed'}
      data-side={positioner.placedSide}
      data-align={positioner.placedAlign}
      {...props}
      ref={composed}
      style={
        {
          ...positioner.floatingStyles,
          '--tour-content-transform-origin': positioner.transformOrigin,
          outline: 'none',
          ...style,
        } as React.CSSProperties
      }
    />
  );
});

const HotspotClose = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(
  function HotspotClose({ onClick, ...props }, ref) {
    const ctx = useHotspot('<Hotspot.Close>');
    return (
      <Primitive.button
        type="button"
        aria-label={props.children ? undefined : 'Close hint'}
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => {
          ctx.setOpen(false);
          ctx.beacon?.focus();
        })}
      />
    );
  },
);

export const Hotspot = {
  Root: HotspotRoot,
  Portal,
  Beacon: HotspotBeacon,
  Content: HotspotContent,
  Close: HotspotClose,
};

export { HotspotBeacon, HotspotClose, HotspotContent, HotspotRoot };
