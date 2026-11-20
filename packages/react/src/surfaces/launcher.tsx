import type { Tour as TourInstance } from '@awesome-tour/core';
import * as React from 'react';
import { useTourProvider } from '../context';
import { useStoreSelector } from '../hooks';
import { Portal } from '../tour';
import { composeEventHandlers, useComposedRefs } from '../utils/compose';
import { useCallbackRef } from '../utils/hooks';
import { type PositionerOptions, usePositioner } from '../utils/positioner';
import { Presence } from '../utils/presence';
import { Primitive, type PrimitiveProps } from '../utils/primitive';

interface LauncherContextValue {
  open: boolean;
  setOpen(open: boolean): void;
  trigger: HTMLElement | null;
  setTrigger(el: HTMLElement | null): void;
  contentId: string;
}

const LauncherContext = React.createContext<LauncherContextValue | null>(null);
function useLauncher(name: string) {
  const ctx = React.useContext(LauncherContext);
  if (!ctx) throw new Error(`[awesome-tour] ${name} must be used within <Launcher.Root>`);
  return ctx;
}

export interface LauncherRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

/**
 * A help menu / resource center: a button that opens a panel listing tours (to replay), checklists,
 * announcements and links. Built from the same primitives as everything else.
 */
function LauncherRoot({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: LauncherRootProps) {
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
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const contentId = `launcher${React.useId().replace(/:/g, '')}`;
  return (
    <LauncherContext.Provider value={{ open, setOpen, trigger, setTrigger, contentId }}>
      {children}
    </LauncherContext.Provider>
  );
}

const LauncherTrigger = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(
  function LauncherTrigger({ onClick, ...props }, ref) {
    const ctx = useLauncher('<Launcher.Trigger>');
    const composed = useComposedRefs<HTMLButtonElement>(
      ref,
      ctx.setTrigger as React.Ref<HTMLButtonElement>,
    );
    return (
      <Primitive.button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.contentId : undefined}
        data-state={ctx.open ? 'open' : 'closed'}
        {...props}
        ref={composed}
        onClick={composeEventHandlers(onClick, () => ctx.setOpen(!ctx.open))}
      />
    );
  },
);

export interface LauncherContentProps
  extends PrimitiveProps<'div'>,
    Omit<PositionerOptions, 'dir'> {
  forceMount?: boolean;
}

/** The panel, positioned next to the trigger. Escape or a click outside closes it. */
const LauncherContent = React.forwardRef<HTMLDivElement, LauncherContentProps>(
  function LauncherContent({ forceMount, ...props }, ref) {
    const ctx = useLauncher('<Launcher.Content>');
    return (
      <Presence present={forceMount || ctx.open}>
        <LauncherContentImpl {...props} ref={ref} />
      </Presence>
    );
  },
);

const LauncherContentImpl = React.forwardRef<
  HTMLDivElement,
  Omit<LauncherContentProps, 'forceMount'>
>(function LauncherContentImpl(
  {
    side = 'top',
    align = 'end',
    sideOffset = 10,
    alignOffset,
    avoidCollisions,
    collisionPadding,
    sticky,
    hideWhenDetached,
    style,
    ...props
  },
  ref,
) {
  const ctx = useLauncher('<Launcher.Content>');
  const positioner = usePositioner(ctx.trigger, {
    side,
    align,
    sideOffset,
    alignOffset,
    avoidCollisions,
    collisionPadding,
    sticky,
    hideWhenDetached,
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
    const close = () => {
      ctx.setOpen(false);
      ctx.trigger?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!node.contains(t) && !ctx.trigger?.contains(t)) ctx.setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [ctx.open, node, ctx.setOpen, ctx.trigger]);

  if (!ctx.trigger) return null;
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

/** Where a tour stands for the person using the app. */
export type LauncherItemStatus = 'new' | 'in-progress' | 'done';

const statusOf = (status: string): LauncherItemStatus =>
  status === 'completed' || status === 'skipped'
    ? 'done'
    : status === 'idle'
      ? 'new'
      : 'in-progress';

/**
 * The status of a tour (or of a tour id on the `TourProvider`), for launcher items and badges.
 * A tour that hasn't run in this page yet falls back to what the provider's `impressions`
 * remember, so a tour finished in an earlier session isn't "new" again.
 */
export function useLauncherStatus(
  tour: TourInstance<any, any> | string | undefined,
): LauncherItemStatus {
  const provider = useTourProvider();
  const instance = typeof tour === 'string' ? provider?.manager.get(tour) : tour;
  const status = useStoreSelector(instance ?? IDLE_STORE, (s: { status: string }) => s.status);
  const [remembered, setRemembered] = React.useState<LauncherItemStatus | null>(null);
  const manager = provider?.manager;
  const id = instance?.id;
  React.useEffect(() => {
    if (status !== 'idle' || !manager || !id || !manager.get(id)) return;
    let alive = true;
    manager
      .getImpression(id)
      .then((record) => {
        if (!alive) return;
        const outcome = record.outcome;
        setRemembered(
          outcome === 'completed' || outcome === 'skipped'
            ? 'done'
            : record.shows > 0
              ? 'in-progress'
              : null,
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [status, manager, id]);
  const current = statusOf(status);
  return current === 'new' && remembered ? remembered : current;
}

const IDLE_STATE = { status: 'idle' };
const IDLE_STORE = { getState: () => IDLE_STATE, subscribe: () => () => {} };

export interface LauncherItemProps extends PrimitiveProps<'button'> {
  /** A tour to (re)start: an instance, or an id registered on the `TourProvider`. */
  tour?: TourInstance<any, any> | string;
  /** Keep the panel open after selecting. Default: false. */
  keepOpen?: boolean;
}

/**
 * An entry. With `tour`, it restarts that tour (through the provider's manager, so it queues
 * politely) and carries `data-status="new|in-progress|done"`. Use `asChild` for links.
 */
const LauncherItem = React.forwardRef<HTMLButtonElement, LauncherItemProps>(function LauncherItem(
  { tour, keepOpen = false, onClick, ...props },
  ref,
) {
  const ctx = useLauncher('<Launcher.Item>');
  const provider = useTourProvider();
  const status = useLauncherStatus(tour);
  return (
    <Primitive.button
      type="button"
      data-status={tour ? status : undefined}
      {...props}
      ref={ref}
      onClick={composeEventHandlers(onClick, () => {
        if (tour) {
          const id = typeof tour === 'string' ? tour : tour.id;
          const managed = provider?.manager.get(id);
          if (managed) void provider!.manager.start(id, { force: true, interrupt: true });
          else if (typeof tour !== 'string') void tour.start({ force: true });
        }
        if (!keepOpen) ctx.setOpen(false);
      })}
    />
  );
});

export interface LauncherBadgeProps extends Omit<PrimitiveProps<'span'>, 'children'> {
  /** Tours to count: those the user hasn't finished. */
  tours: readonly (TourInstance<any, any> | string)[];
  children?: (count: number) => React.ReactNode;
}

function Count({
  tour,
  onStatus,
}: {
  tour: TourInstance<any, any> | string;
  onStatus: (done: boolean) => void;
}) {
  const status = useLauncherStatus(tour);
  React.useEffect(() => onStatus(status === 'done'), [status, onStatus]);
  return null;
}

/** How many of `tours` are unfinished. Renders nothing at zero. */
const LauncherBadge = React.forwardRef<HTMLSpanElement, LauncherBadgeProps>(function LauncherBadge(
  { tours, children, ...props },
  ref,
) {
  const [done, setDone] = React.useState<Record<number, boolean>>({});
  const callbacks = React.useMemo(
    () =>
      tours.map(
        (_, i) => (d: boolean) => setDone((prev) => (prev[i] === d ? prev : { ...prev, [i]: d })),
      ),
    [tours],
  );
  const count = tours.filter((_, i) => !done[i]).length;
  return (
    <>
      {tours.map((t, i) => (
        <Count key={typeof t === 'string' ? t : t.id} tour={t} onStatus={callbacks[i]!} />
      ))}
      {count > 0 && (
        <Primitive.span data-count={count} {...props} ref={ref}>
          {children ? children(count) : count}
        </Primitive.span>
      )}
    </>
  );
});

export const Launcher = {
  Root: LauncherRoot,
  Trigger: LauncherTrigger,
  Portal,
  Content: LauncherContent,
  Item: LauncherItem,
  Badge: LauncherBadge,
};

export { LauncherBadge, LauncherContent, LauncherItem, LauncherRoot, LauncherTrigger };
