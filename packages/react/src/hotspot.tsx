import {
  createVirtualTarget,
  defaultAnchors,
  isAnchorTarget,
  type PersistenceAdapter,
  resolveTarget,
  subscribeDomActivity,
  type TargetInput,
  type TourTargetNode,
} from '@awesome-tour/core';
import * as React from 'react';
import { useTourProvider } from './context';
import { useStoreSelector } from './hooks';
import { MessagesScope, type TourMessagesInput, useTourMessages } from './messages';
import { Portal } from './tour';
import { composeEventHandlers, useComposedRefs } from './utils/compose';
import { useCallbackRef, useIsomorphicLayoutEffect } from './utils/hooks';
import { type PositionerOptions, usePositioner } from './utils/positioner';
import { Presence } from './utils/presence';
import { Primitive, type PrimitiveProps } from './utils/primitive';

/** Resolve a target and keep it in sync with DOM changes and anchor registrations. */
/**
 * A stable identity for a target: selectors and `anchor()` calls are compared by value, so inline
 * `target={anchor('x')}` doesn't resubscribe on every render. Other targets compare by reference.
 */
function targetKey(target: TargetInput | null | undefined): unknown {
  if (typeof target === 'string') return target;
  if (isAnchorTarget(target)) return `anchor:${target.__tourAnchor}`;
  if (Array.isArray(target)) {
    const keys = target.map(targetKey);
    return keys.every((k) => typeof k === 'string') ? keys.join('\u0000') : target;
  }
  return target;
}

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
    const offActivity = subscribeDomActivity(update);
    return () => {
      unsubscribe();
      offActivity();
    };
  }, [anchors, targetKey(target)]);
  return nodes;
}

/* -----------------------------------------------------------------------------------------------*/

const NO_MANAGER_STATE = { activeId: null };
const NO_MANAGER = { getState: () => NO_MANAGER_STATE, subscribe: () => () => {} };

/** What a hotspot remembers between visits. */
export interface HotspotRecord {
  seen: boolean;
  seenAt: number;
}

interface HotspotContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Opened at least once (persisted with `persistence`). */
  seen: boolean;
  /** Not rendered: `once` and seen, or a modal tour is on screen. */
  hidden: boolean;
  trigger: 'click' | 'hover';
  /** Hover: schedule a close (cancelled when the pointer comes back). */
  hoverLeave: () => void;
  hoverEnter: () => void;
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
  /** Stable id: the key under which `persistence` remembers the hint was seen. */
  id?: string;
  /** Remember that the user opened the hint (localStorage, your API…). Requires `id`. */
  persistence?: PersistenceAdapter<HotspotRecord>;
  /** Stop showing the hint once it has been opened and closed. Default: false. */
  once?: boolean;
  /** `click` (default) or `hover` (also opens on keyboard focus). */
  trigger?: 'click' | 'hover';
  /** Hide the beacon while a modal tour is on screen. Default: true. */
  hideDuringTours?: boolean;
  /** Translations for the hint's accessible names. */
  messages?: TourMessagesInput;
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
  id: hotspotId,
  persistence,
  once = false,
  trigger = 'click',
  hideDuringTours = true,
  messages,
  children,
}: HotspotRootProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const handleChange = useCallbackRef(onOpenChange);
  const [seen, setSeen] = React.useState(false);
  const [closedAfterSeen, setClosedAfterSeen] = React.useState(false);

  React.useEffect(() => {
    if (!persistence || !hotspotId) return;
    let cancelled = false;
    void Promise.resolve(persistence.get(hotspotId)).then((record) => {
      if (cancelled || !record?.seen) return;
      setSeen(true);
      setClosedAfterSeen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [persistence, hotspotId]);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      handleChange(next);
      if (next && !seen) {
        setSeen(true);
        if (persistence && hotspotId) {
          const warn = (error: unknown) =>
            console.warn('[awesome-tour] hotspot: saving failed', error);
          try {
            const saving = persistence.set(hotspotId, { seen: true, seenAt: Date.now() });
            if (saving instanceof Promise) saving.catch(warn);
          } catch (error) {
            warn(error);
          }
        }
      }
      if (!next && seen) setClosedAfterSeen(true);
    },
    [openProp, handleChange, seen, persistence, hotspotId],
  );

  // Hover: open on enter, close shortly after leaving both the beacon and the content.
  const leaveTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoverEnter = React.useCallback(() => {
    clearTimeout(leaveTimer.current);
    if (!open) setOpen(true);
  }, [open, setOpen]);
  const hoverLeave = React.useCallback(() => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setOpen(false), 150);
  }, [setOpen]);
  React.useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // A modal tour on screen takes over: hide hints until it's done.
  const provider = useTourProvider();
  const tourOnScreen = useStoreSelector(
    provider?.manager ?? NO_MANAGER,
    (st: { activeId: string | null }) => {
      const active = st.activeId ? provider?.manager.get(st.activeId) : undefined;
      return !!active?.modal;
    },
  );
  const hidden = (once && closedAfterSeen && !open) || (hideDuringTours && tourOnScreen);
  const targets = useResolvedTarget(target);
  const [beacon, setBeacon] = React.useState<HTMLElement | null>(null);
  const id = React.useId().replace(/:/g, '');
  return (
    <MessagesScope messages={messages}>
      <HotspotContext.Provider
        value={{
          open: open && !hidden,
          setOpen,
          seen,
          hidden,
          trigger,
          hoverEnter,
          hoverLeave,
          targets,
          beacon,
          setBeacon,
          contentId: `hotspot${id}`,
        }}
      >
        {children}
      </HotspotContext.Provider>
    </MessagesScope>
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
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      style,
      ...props
    },
    ref,
  ) {
    const ctx = useHotspot('<Hotspot.Beacon>');
    const { showHint } = useTourMessages();
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
    if (!reference || ctx.hidden) return null;
    const hover = ctx.trigger === 'hover';
    return (
      <Primitive.button
        type="button"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.contentId : undefined}
        aria-haspopup="dialog"
        aria-label={props.children ? undefined : showHint}
        data-state={ctx.open ? 'open' : 'closed'}
        data-seen={ctx.seen ? '' : undefined}
        data-tour-beacon=""
        {...props}
        ref={composed}
        style={{
          ...positioner.floatingStyles,
          visibility: positioner.isReferenceHidden ? 'hidden' : undefined,
          ...style,
        }}
        onClick={composeEventHandlers(onClick, () => ctx.setOpen(!ctx.open))}
        onPointerEnter={composeEventHandlers(onPointerEnter, () => hover && ctx.hoverEnter())}
        onPointerLeave={composeEventHandlers(onPointerLeave, () => hover && ctx.hoverLeave())}
        onFocus={composeEventHandlers(onFocus, () => hover && ctx.hoverEnter())}
        onBlur={composeEventHandlers(onBlur, () => hover && ctx.hoverLeave())}
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
    onPointerEnter,
    onPointerLeave,
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
      onPointerEnter={composeEventHandlers(onPointerEnter, () => {
        if (ctx.trigger === 'hover') ctx.hoverEnter();
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => {
        if (ctx.trigger === 'hover') ctx.hoverLeave();
      })}
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
    const { closeHint } = useTourMessages();
    return (
      <Primitive.button
        type="button"
        aria-label={props.children ? undefined : closeHint}
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
