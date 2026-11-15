import {
  createTour,
  createVirtualTarget,
  inertOthers,
  inflateRect,
  isElement,
  type RectLike,
  type StartOptions,
  type Tour as TourInstance,
  type TourPlugin,
  type TourState,
} from '@awesome-tour/core';
import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  createContentStore,
  type ReactStepDefinition,
  type StepRenderProps,
  TourContext,
  type TourContextValue,
  useTourContext,
  useTourProvider,
} from './context';
import { useTargetRect, useTourAnchor, useTourSelector } from './hooks';
import { composeEventHandlers, useComposedRefs } from './utils/compose';
import {
  getTabbables,
  isEditable,
  useCallbackRef,
  useIsMounted,
  useIsomorphicLayoutEffect,
  visuallyHidden,
} from './utils/hooks';
import { type Align, type PositionerOptions, type Side, usePositioner } from './utils/positioner';
import { Presence } from './utils/presence';
import { Primitive, type PrimitiveProps } from './utils/primitive';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

export interface TourRootProps<TData = any> {
  /** A tour created with `createTour`. */
  tour?: TourInstance<any, TData>;
  /** Id of a tour registered on the `TourProvider`. */
  tourId?: string;
  /** Inline tour: id used when neither `tour` nor `tourId` is given. */
  id?: string;
  /** Inline tour: steps (merged before declarative `<Tour.Step>` children). */
  steps?: readonly ReactStepDefinition<TData>[];
  /** Inline tour: plugins (persistence, analytics…). Read once on mount. */
  plugins?: readonly TourPlugin<string, TData>[];
  /** Inline tour: initial data. Read once on mount. */
  data?: TData;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled current step id. */
  step?: string;
  /** Step to start from when opened via `open`/`defaultOpen`. */
  defaultStep?: string;
  onStepChange?: (stepId: string) => void;

  /** Block the page (focus trap, inert outside, overlay). Default: the tour's `modal`. */
  modal?: boolean;
  /** Let users interact with highlighted targets on every step. */
  targetInteraction?: boolean;
  dir?: 'ltr' | 'rtl';
  /** ←/→ navigate between steps. Default: true. */
  keyboardNavigation?: boolean;
  /** Escape closes the tour. Default: true. */
  closeOnEscape?: boolean;
  /** Clicking the overlay closes the tour. Default: false. */
  closeOnOverlayClick?: boolean;
  /** Return focus to the previously focused element when the tour closes. Default: true. */
  restoreFocus?: boolean;
  /** Screen reader announcement on step change. `false` disables it. */
  announce?:
    | false
    | ((info: { state: TourState; step: ReactStepDefinition | undefined }) => string);
  children?: React.ReactNode;
}

const defaultAnnounce: NonNullable<Exclude<TourRootProps['announce'], false>> = ({ state }) =>
  `Step ${state.progress.current} of ${state.progress.total}`;

function hasEventAdvance(step: ReactStepDefinition | undefined) {
  if (!step?.advanceOn) return false;
  const rules = Array.isArray(step.advanceOn) ? step.advanceOn : [step.advanceOn];
  return rules.some((r) => !!r.event && !r.target);
}

function TourRoot<TData = any>(props: TourRootProps<TData>) {
  const {
    tour: tourProp,
    tourId,
    id,
    steps,
    plugins,
    data,
    open: openProp,
    defaultOpen,
    onOpenChange,
    step: stepProp,
    defaultStep,
    onStepChange,
    modal: modalProp,
    targetInteraction,
    dir = 'ltr',
    keyboardNavigation = true,
    closeOnEscape = true,
    closeOnOverlayClick = false,
    restoreFocus = true,
    announce = defaultAnnounce,
    children,
  } = props;

  const provider = useTourProvider();
  const generatedId = React.useId();
  const [inlineTour] = React.useState(() =>
    tourProp || tourId
      ? null
      : createTour({
          id: id ?? `tour${generatedId}`,
          steps: steps ?? [],
          plugins: plugins ?? [],
          data: data ?? ({} as TData),
          anchors: provider?.anchors,
        }),
  );
  const tour = (tourProp ??
    (tourId ? provider?.manager.get(tourId) : undefined) ??
    inlineTour) as TourInstance<any, TData> | null;
  if (!tour) {
    throw new Error(`[awesome-tour] <Tour.Root tourId="${tourId}"> not found on <TourProvider>`);
  }

  // Register instance/inline tours with the provider's manager (queueing, router).
  React.useEffect(() => {
    if (!provider || tourId) return;
    return provider.manager.register(tour);
  }, [provider, tour, tourId]);

  /* Declarative steps -------------------------------------------------------------------------*/
  const [contents] = React.useState(createContentStore);
  const declared = React.useRef<(() => ReactStepDefinition)[]>([]);
  const configSteps = React.useRef<readonly ReactStepDefinition[] | null>(null);
  if (configSteps.current === null) {
    configSteps.current = steps ?? (tour.getSteps() as readonly ReactStepDefinition[]);
  }
  const syncSteps = React.useCallback(() => {
    tour.setSteps([...(configSteps.current ?? []), ...declared.current.map((get) => get())]);
  }, [tour]);
  useIsomorphicLayoutEffect(() => {
    if (!steps || steps === configSteps.current) return;
    configSteps.current = steps;
    syncSteps();
  }, [steps, syncSteps]);
  const registerStep = React.useCallback(
    (get: () => ReactStepDefinition) => {
      declared.current = [...declared.current, get];
      syncSteps();
      return () => {
        declared.current = declared.current.filter((g) => g !== get);
        syncSteps();
      };
    },
    [syncSteps],
  );

  /* State ------------------------------------------------------------------------------------*/
  const state = useTourSelector(tour);
  const open = state.status === 'active' && state.phase !== 'resolving';
  const step = tour.getStep(state.stepId as string) as ReactStepDefinition | undefined;
  const modal = step?.modal ?? modalProp ?? tour.modal;
  const interactive = step?.interactive ?? targetInteraction ?? hasEventAdvance(step);

  /* Controlled open / step --------------------------------------------------------------------*/
  const startTour = React.useCallback(
    (options?: StartOptions) => {
      if (provider && !tourId && provider.manager.get(tour.id) === tour) {
        return provider.manager.start(tour.id, options);
      }
      if (provider && tourId) return provider.manager.start(tourId, options);
      return tour.start(options);
    },
    [provider, tour, tourId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  React.useEffect(() => {
    if (defaultOpen) void startTour(defaultStep ? { stepId: defaultStep } : undefined);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: react to `open` only
  React.useEffect(() => {
    if (openProp === undefined) return;
    const { status } = tour.getState();
    const onScreen = status === 'active' || status === 'starting';
    if (openProp && !onScreen)
      void startTour((stepProp ?? defaultStep) ? { stepId: stepProp ?? defaultStep } : undefined);
    if (!openProp && onScreen) tour.close();
  }, [openProp, tour]);

  React.useEffect(() => {
    if (stepProp === undefined) return;
    const current = tour.getState();
    if (current.status === 'active' && current.stepId !== stepProp) void tour.goTo(stepProp);
  }, [stepProp, tour]);

  const handleOpenChange = useCallbackRef(onOpenChange);
  const handleStepChange = useCallbackRef(onStepChange);
  const isActive = state.status === 'active';
  const wasActive = React.useRef(isActive);
  React.useEffect(() => {
    if (wasActive.current === isActive) return;
    wasActive.current = isActive;
    handleOpenChange(isActive);
  }, [isActive, handleOpenChange]);
  React.useEffect(
    () => tour.on('stepChange', ({ to }) => handleStepChange(to)),
    [tour, handleStepChange],
  );

  /* Focus restore ------------------------------------------------------------------------------*/
  const returnFocus = React.useRef<HTMLElement | null>(null);
  // Capture the focused element synchronously when the tour starts — before any content
  // renders and moves focus into itself.
  React.useEffect(() => {
    let wasOnScreen = false;
    const capture = () => {
      const { status } = tour.getState();
      const onScreen = status === 'starting' || status === 'active';
      if (onScreen && !wasOnScreen && !returnFocus.current) {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) returnFocus.current = active;
      }
      wasOnScreen = onScreen;
    };
    capture();
    return tour.subscribe(capture);
  }, [tour]);
  // Passive effect: runs after the content's `inert` cleanup, so the element is focusable again.
  React.useEffect(() => {
    if (open) return;
    if (state.status === 'active' || state.status === 'starting') return; // between steps
    const el = returnFocus.current;
    returnFocus.current = null;
    if (restoreFocus && el?.isConnected) el.focus({ preventScroll: true });
  }, [open, state.status, restoreFocus]);

  /* Layers kept interactive under the modal --------------------------------------------------*/
  const [layers] = React.useState(() => new Set<HTMLElement>());
  const [layersVersion, setLayersVersion] = React.useState(0);
  const registerLayer = React.useCallback(
    (el: HTMLElement) => {
      layers.add(el);
      setLayersVersion((v) => v + 1);
      return () => {
        layers.delete(el);
        setLayersVersion((v) => v + 1);
      };
    },
    [layers],
  );

  const contentId = `tour-content${generatedId.replace(/:/g, '')}`;
  const value: TourContextValue = {
    tour,
    state,
    open,
    step,
    modal,
    interactive,
    dir,
    keyboardNavigation,
    closeOnEscape,
    closeOnOverlayClick,
    contentId,
    contents,
    registerStep,
    registerLayer,
    layers,
    layersVersion,
  };

  const message = open && announce ? announce({ state, step }) : '';

  return (
    <TourContext.Provider value={value}>
      {children}
      {announce !== false && (
        <div aria-live="polite" aria-atomic="true" style={visuallyHidden} data-tour-announcer="">
          {message}
        </div>
      )}
    </TourContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Step (declarative)
 * -----------------------------------------------------------------------------------------------*/

export interface TourStepProps extends ReactStepDefinition {
  /** Content shown in `Tour.StepContent` while this step is active. */
  children?: React.ReactNode;
}

/**
 * Declare a step in JSX. Steps register in render order; render nothing by themselves — their
 * children are rendered by `<Tour.StepContent />`.
 */
function TourStep({ children, ...definition }: TourStepProps) {
  const { registerStep, contents } = useTourContext('<Tour.Step>');
  const latest = React.useRef(definition);
  latest.current = definition;
  const { id } = definition;

  useIsomorphicLayoutEffect(() => {
    // Functions delegate to the latest props so inline callbacks never go stale.
    const get = (): ReactStepDefinition => {
      const d = latest.current;
      return {
        ...d,
        ...(d.when ? { when: (ctx) => latest.current.when!(ctx) } : {}),
        ...(typeof d.next === 'function'
          ? { next: (ctx) => (latest.current.next as (c: typeof ctx) => string | null)(ctx) }
          : {}),
        ...(d.beforeEnter ? { beforeEnter: (ctx) => latest.current.beforeEnter!(ctx) } : {}),
        ...(d.afterLeave ? { afterLeave: (ctx) => latest.current.afterLeave!(ctx) } : {}),
      };
    };
    return registerStep(get);
  }, [id, registerStep]);

  useIsomorphicLayoutEffect(() => {
    contents.set(id, children);
  }, [id, children, contents]);
  useIsomorphicLayoutEffect(() => () => contents.delete(id), [id, contents]);

  return null;
}

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

export interface TourTriggerProps extends PrimitiveProps<'button'> {
  /** Restart from the first step even if the tour was completed/skipped before. Default: true. */
  restart?: boolean;
  stepId?: string;
}

const TourTrigger = React.forwardRef<HTMLButtonElement, TourTriggerProps>(function TourTrigger(
  { restart = true, stepId, onClick, ...props },
  ref,
) {
  const { tour, open, contentId } = useTourContext('<Tour.Trigger>');
  const provider = useTourProvider();
  return (
    <Primitive.button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      data-state={open ? 'open' : 'closed'}
      {...props}
      ref={ref}
      onClick={composeEventHandlers(onClick, () => {
        const options = { force: restart, ...(stepId ? { stepId } : {}) };
        if (provider?.manager.get(tour.id) === tour) void provider.manager.start(tour.id, options);
        else void tour.start(options);
      })}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * Portal
 * -----------------------------------------------------------------------------------------------*/

export interface PortalProps {
  /** Where to render. Default: `document.body`. */
  container?: Element | DocumentFragment | null;
  children?: React.ReactNode;
}

export function Portal({ container, children }: PortalProps) {
  const mounted = useIsMounted();
  if (!mounted) return null;
  const target = container ?? globalThis.document?.body;
  return target ? createPortal(children, target) : null;
}

/* -------------------------------------------------------------------------------------------------
 * Overlay
 * -----------------------------------------------------------------------------------------------*/

export type Padding = number | Partial<Record<Side, number>>;

/** SVG path covering the whole viewport with a rounded-rect hole (even-odd fill). */
export function getSpotlightPath(rect: RectLike | null, radius = 0): string {
  const outer = 'M-99999 -99999H99999V99999H-99999Z';
  if (!rect) return outer;
  const { x, y, width: w, height: h } = rect;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return (
    `${outer}M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/** Registers an element as a layer that stays interactive while a modal tour is open. */
export function useTourLayer(): React.RefCallback<HTMLElement> {
  const { registerLayer } = useTourContext('useTourLayer');
  const cleanup = React.useRef<(() => void) | null>(null);
  return React.useCallback(
    (el: HTMLElement | null) => {
      cleanup.current?.();
      cleanup.current = el ? registerLayer(el) : null;
    },
    [registerLayer],
  );
}

export interface TourOverlayProps extends PrimitiveProps<'div'> {
  /** Space between the target and the cutout edge. Default: 4. */
  padding?: Padding;
  /** Cutout corner radius. Default: 4. */
  radius?: number;
  forceMount?: boolean;
}

/**
 * Dims the page with a cutout around the target. Color via `--tour-overlay-color` (default
 * `rgb(0 0 0 / 0.5)`). Clicks through the cutout reach the target only when the step is interactive.
 */
const TourOverlay = React.forwardRef<HTMLDivElement, TourOverlayProps>(function TourOverlay(
  { forceMount, ...props },
  ref,
) {
  const { open } = useTourContext('<Tour.Overlay>');
  return (
    <Presence present={forceMount || open}>
      <TourOverlayImpl {...props} ref={ref} />
    </Presence>
  );
});

const TourOverlayImpl = React.forwardRef<HTMLDivElement, Omit<TourOverlayProps, 'forceMount'>>(
  function TourOverlayImpl({ padding = 4, radius = 4, style, onClick, children, ...props }, ref) {
    const ctx = useTourContext('<Tour.Overlay>');
    const rect = useTargetRect();
    const layerRef = useTourLayer();
    const composedRef = useComposedRefs(ref, layerRef as React.Ref<HTMLDivElement>);
    const cutout = rect ? inflateRect(rect, padding) : null;
    const handleClick = composeEventHandlers(onClick, () => {
      if (ctx.closeOnOverlayClick) ctx.tour.close();
    });
    return (
      <Primitive.div
        aria-hidden="true"
        data-state={ctx.open ? 'open' : 'closed'}
        data-tour-overlay=""
        {...props}
        ref={composedRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          ...(cutout
            ? ({
                '--tour-spotlight-x': `${cutout.x}px`,
                '--tour-spotlight-y': `${cutout.y}px`,
                '--tour-spotlight-width': `${cutout.width}px`,
                '--tour-spotlight-height': `${cutout.height}px`,
              } as React.CSSProperties)
            : {}),
          ...style,
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          aria-hidden="true"
        >
          <path
            d={getSpotlightPath(cutout, radius)}
            fillRule="evenodd"
            style={{ fill: 'var(--tour-overlay-color, rgb(0 0 0 / 0.5))', pointerEvents: 'auto' }}
            onClick={handleClick as unknown as React.MouseEventHandler<SVGPathElement>}
          />
          {cutout && !ctx.interactive && (
            <rect
              x={cutout.x}
              y={cutout.y}
              width={cutout.width}
              height={cutout.height}
              fill="transparent"
              style={{ pointerEvents: 'auto' }}
            />
          )}
        </svg>
        {children}
      </Primitive.div>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Spotlight
 * -----------------------------------------------------------------------------------------------*/

export interface TourSpotlightProps extends PrimitiveProps<'div'> {
  padding?: Padding;
  forceMount?: boolean;
}

/** A box positioned over the target — style it as a ring, glow, or a box-shadow backdrop. */
const TourSpotlight = React.forwardRef<HTMLDivElement, TourSpotlightProps>(function TourSpotlight(
  { forceMount, ...props },
  ref,
) {
  const { open, state } = useTourContext('<Tour.Spotlight>');
  return (
    <Presence present={forceMount || (open && state.targets.length > 0)}>
      <TourSpotlightImpl {...props} ref={ref} />
    </Presence>
  );
});

const TourSpotlightImpl = React.forwardRef<HTMLDivElement, Omit<TourSpotlightProps, 'forceMount'>>(
  function TourSpotlightImpl({ padding = 4, style, ...props }, ref) {
    const { open } = useTourContext('<Tour.Spotlight>');
    const rect = useTargetRect();
    const r = rect ? inflateRect(rect, padding) : null;
    return (
      <Primitive.div
        aria-hidden="true"
        data-state={open ? 'open' : 'closed'}
        data-tour-spotlight=""
        {...props}
        ref={ref}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          top: r?.y ?? 0,
          left: r?.x ?? 0,
          width: r?.width ?? 0,
          height: r?.height ?? 0,
          visibility: r ? undefined : 'hidden',
          ...style,
        }}
      />
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

interface ContentContextValue {
  placedSide: Side | 'none';
  placedAlign: Align;
  setArrow: (node: HTMLElement | null) => void;
  arrowX?: number;
  arrowY?: number;
  shouldHideArrow: boolean;
  setTitleId: (id: string | undefined) => void;
  setDescriptionId: (id: string | undefined) => void;
}

const ContentContext = React.createContext<ContentContextValue | null>(null);

export function useTourContentContext(): ContentContextValue {
  const ctx = React.useContext(ContentContext);
  if (!ctx) throw new Error('[awesome-tour] Must be used within <Tour.Content>');
  return ctx;
}

export interface TourContentProps
  extends PrimitiveProps<'div'>,
    Omit<PositionerOptions, 'dir' | 'animationFrame'> {
  forceMount?: boolean;
  /** Move focus into the content when a step is shown. Default: true. */
  autoFocus?: boolean;
  /** Called on Escape. `event.preventDefault()` keeps the tour open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

const TourContent = React.forwardRef<HTMLDivElement, TourContentProps>(function TourContent(
  { forceMount, ...props },
  ref,
) {
  const { open } = useTourContext('<Tour.Content>');
  return (
    <Presence present={forceMount || open}>
      <TourContentImpl {...props} ref={ref} />
    </Presence>
  );
});

const TourContentImpl = React.forwardRef<HTMLDivElement, Omit<TourContentProps, 'forceMount'>>(
  function TourContentImpl(props, forwardedRef) {
    const {
      side,
      align,
      sideOffset,
      alignOffset,
      avoidCollisions,
      collisionPadding,
      arrowPadding,
      sticky,
      hideWhenDetached,
      autoFocus = true,
      onEscapeKeyDown,
      onKeyDown,
      style,
      ...contentProps
    } = props;
    const ctx = useTourContext('<Tour.Content>');
    const { tour, state, step, open, modal, dir } = ctx;
    const targets = state.targets;
    const centered = targets.length === 0;

    const reference = React.useMemo(() => createVirtualTarget(targets), [targets]);
    const positioner = usePositioner(reference, {
      side: step?.side ?? side,
      align: step?.align ?? align,
      sideOffset,
      alignOffset,
      avoidCollisions,
      collisionPadding,
      arrowPadding,
      sticky,
      hideWhenDetached,
      dir,
      animationFrame: targets.some((t) => !isElement(t)),
    });

    const [wrapper, setWrapper] = React.useState<HTMLDivElement | null>(null);
    const [content, setContent] = React.useState<HTMLDivElement | null>(null);
    const wrapperRef = useComposedRefs<HTMLDivElement>(
      setWrapper,
      positioner.setFloating as React.Ref<HTMLDivElement>,
    );
    const contentRef = useComposedRefs<HTMLDivElement>(forwardedRef, setContent);
    const [titleId, setTitleId] = React.useState<string>();
    const [descriptionId, setDescriptionId] = React.useState<string>();

    // Focus the dialog on each step so screen readers announce it.
    useIsomorphicLayoutEffect(() => {
      if (!autoFocus || !open || !content) return;
      if (!content.contains(document.activeElement)) content.focus({ preventScroll: true });
    }, [autoFocus, open, content, state.stepId]);

    // Keyboard: Escape, arrows.
    const handleEscape = useCallbackRef(onEscapeKeyDown);
    React.useEffect(() => {
      if (!open) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return;
        if (event.key === 'Escape') {
          handleEscape(event);
          if (!event.defaultPrevented && ctx.closeOnEscape) {
            event.preventDefault();
            tour.close();
          }
          return;
        }
        if (!ctx.keyboardNavigation || isEditable(event.target)) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        if (event.key === forward) {
          event.preventDefault();
          void tour.next();
        } else if (event.key === backward) {
          event.preventDefault();
          void tour.prev();
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, tour, dir, ctx.closeOnEscape, ctx.keyboardNavigation, handleEscape]);

    // Modal: make everything else inert (targets and registered layers stay interactive).
    const { layers, layersVersion } = ctx;
    // biome-ignore lint/correctness/useExhaustiveDependencies: `layers` is a mutable set; `layersVersion` tracks it
    React.useEffect(() => {
      if (!modal || !open || !wrapper) return;
      const keep: Element[] = [wrapper, ...layers, ...targets.filter(isElement)];
      return inertOthers(keep);
    }, [modal, open, wrapper, targets, layers, layersVersion]);

    // Link the target to the content for assistive tech; mark it for styling.
    React.useEffect(() => {
      if (!open) return;
      const elements = targets.filter(isElement);
      for (const el of elements) {
        const ids = (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
        if (!ids.includes(ctx.contentId))
          el.setAttribute('aria-describedby', [...ids, ctx.contentId].join(' '));
        el.setAttribute('data-tour-target', '');
      }
      return () => {
        for (const el of elements) {
          const ids = (el.getAttribute('aria-describedby') ?? '')
            .split(' ')
            .filter((t) => t && t !== ctx.contentId);
          if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
          else el.removeAttribute('aria-describedby');
          el.removeAttribute('data-tour-target');
        }
      };
    }, [open, targets, ctx.contentId]);

    // Modal focus trap (Tab cycles inside the content).
    const handleKeyDown = composeEventHandlers(
      onKeyDown,
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab' || !modal || !content) return;
        const tabbables = getTabbables(content);
        if (tabbables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = tabbables[0]!;
        const last = tabbables[tabbables.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === content)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      },
    );

    const placedSide = centered ? 'none' : positioner.placedSide;
    const wrapperStyle: React.CSSProperties = centered
      ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      : {
          ...positioner.floatingStyles,
          transform: positioner.isPositioned
            ? positioner.floatingStyles.transform
            : 'translate(0, -200%)',
          visibility: positioner.isReferenceHidden ? 'hidden' : undefined,
        };

    const cssVars = {
      '--tour-content-transform-origin': centered ? 'center' : positioner.transformOrigin,
      '--tour-content-available-width':
        positioner.availableWidth !== undefined ? `${positioner.availableWidth}px` : undefined,
      '--tour-content-available-height':
        positioner.availableHeight !== undefined ? `${positioner.availableHeight}px` : undefined,
      '--tour-target-width':
        positioner.referenceWidth !== undefined ? `${positioner.referenceWidth}px` : undefined,
      '--tour-target-height':
        positioner.referenceHeight !== undefined ? `${positioner.referenceHeight}px` : undefined,
    } as React.CSSProperties;

    const contentContext: ContentContextValue = {
      placedSide,
      placedAlign: positioner.placedAlign,
      setArrow: positioner.setArrow,
      arrowX: positioner.arrowX,
      arrowY: positioner.arrowY,
      shouldHideArrow: centered || positioner.shouldHideArrow,
      setTitleId,
      setDescriptionId,
    };

    return (
      <div
        ref={wrapperRef}
        data-tour-content-wrapper=""
        dir={dir}
        style={{ ...wrapperStyle, ...cssVars }}
      >
        <ContentContext.Provider value={contentContext}>
          <Primitive.div
            role="dialog"
            id={ctx.contentId}
            aria-modal={modal || undefined}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            data-state={open ? 'open' : 'closed'}
            data-side={placedSide}
            data-align={centered ? 'center' : positioner.placedAlign}
            data-placement={centered ? 'center' : 'anchored'}
            data-step={state.stepId ?? undefined}
            data-phase={state.phase ?? undefined}
            data-direction={state.direction ?? undefined}
            data-target-missing={state.targetMissing ? '' : undefined}
            {...contentProps}
            ref={contentRef}
            onKeyDown={handleKeyDown}
            style={{ outline: 'none', ...style }}
          />
        </ContentContext.Provider>
      </div>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Arrow
 * -----------------------------------------------------------------------------------------------*/

export interface TourArrowProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  asChild?: boolean;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

const TourArrow = React.forwardRef<HTMLSpanElement, TourArrowProps>(function TourArrow(
  { width = 10, height = 5, asChild, children, style, ...props },
  ref,
) {
  const content = useTourContentContext();
  const composedRef = useComposedRefs<HTMLSpanElement>(
    ref,
    content.setArrow as React.Ref<HTMLSpanElement>,
  );
  if (content.placedSide === 'none') return null;
  const side = content.placedSide;
  const baseSide = OPPOSITE[side];
  return (
    <span
      ref={composedRef}
      data-tour-arrow=""
      data-side={side}
      style={{
        position: 'absolute',
        left: content.arrowX,
        top: content.arrowY,
        [baseSide]: 0,
        transformOrigin: { top: '', right: '0 0', bottom: 'center 0', left: '100% 0' }[side],
        transform: {
          top: 'translateY(100%)',
          right: 'translateY(50%) rotate(90deg) translateX(-50%)',
          bottom: 'rotate(180deg)',
          left: 'translateY(50%) rotate(-90deg) translateX(50%)',
        }[side],
        visibility: content.shouldHideArrow ? 'hidden' : undefined,
        lineHeight: 0,
      }}
    >
      {asChild ? (
        children
      ) : (
        <svg
          width={width}
          height={height}
          viewBox="0 0 30 10"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ display: 'block', ...style }}
          {...props}
        >
          <polygon points="0,0 30,0 15,10" fill="currentColor" />
        </svg>
      )}
    </span>
  );
});

/* -------------------------------------------------------------------------------------------------
 * Title / Description / StepContent
 * -----------------------------------------------------------------------------------------------*/

function useRegisteredId(setter: (id: string | undefined) => void, idProp?: string) {
  const generated = React.useId();
  const id = idProp ?? `tour${generated.replace(/:/g, '')}`;
  useIsomorphicLayoutEffect(() => {
    setter(id);
    return () => setter(undefined);
  }, [id, setter]);
  return id;
}

const TourTitle = React.forwardRef<HTMLHeadingElement, PrimitiveProps<'h2'>>(function TourTitle(
  { children, id: idProp, ...props },
  ref,
) {
  const { step } = useTourContext('<Tour.Title>');
  const content = useTourContentContext();
  const id = useRegisteredId(content.setTitleId, idProp);
  return (
    <Primitive.h2 id={id} {...props} ref={ref}>
      {children ?? step?.title}
    </Primitive.h2>
  );
});

const TourDescription = React.forwardRef<HTMLParagraphElement, PrimitiveProps<'p'>>(
  function TourDescription({ children, id: idProp, ...props }, ref) {
    const { step } = useTourContext('<Tour.Description>');
    const content = useTourContentContext();
    const id = useRegisteredId(content.setDescriptionId, idProp);
    return (
      <Primitive.p id={id} {...props} ref={ref}>
        {children ?? step?.description}
      </Primitive.p>
    );
  },
);

export interface TourStepContentProps {
  /** Shown while a lazy step suspends. */
  fallback?: React.ReactNode;
  /** Render function alternative: receives the current step. */
  children?: (props: StepRenderProps) => React.ReactNode;
}

/** Renders the current step's content: `<Tour.Step>` children, or the step's `content` field. */
function TourStepContent({ fallback = null, children }: TourStepContentProps) {
  const { tour, state, step, contents } = useTourContext('<Tour.StepContent>');
  const declared = React.useSyncExternalStore(
    contents.subscribe,
    () => (state.stepId ? contents.get(state.stepId) : undefined),
    () => undefined,
  );
  if (!step) return null;
  const renderProps: StepRenderProps = { tour, state, step };
  let node: React.ReactNode;
  if (children) node = children(renderProps);
  else if (declared !== undefined) node = declared;
  else node = typeof step.content === 'function' ? step.content(renderProps) : step.content;
  return <React.Suspense fallback={fallback}>{node}</React.Suspense>;
}

/* -------------------------------------------------------------------------------------------------
 * Navigation buttons
 * -----------------------------------------------------------------------------------------------*/

const TourNext = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(function TourNext(
  { onClick, ...props },
  ref,
) {
  const { tour, state } = useTourContext('<Tour.Next>');
  const isLast = state.progress.current >= state.progress.total;
  return (
    <Primitive.button
      type="button"
      data-last={isLast ? '' : undefined}
      {...props}
      ref={ref}
      onClick={composeEventHandlers(onClick, () => void tour.next())}
    />
  );
});

const TourPrev = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(function TourPrev(
  { onClick, disabled, ...props },
  ref,
) {
  const { tour, state } = useTourContext('<Tour.Prev>');
  const isFirst = state.progress.current <= 1 && state.history.length <= 1;
  return (
    <Primitive.button
      type="button"
      disabled={disabled ?? isFirst}
      data-disabled={(disabled ?? isFirst) ? '' : undefined}
      {...props}
      ref={ref}
      onClick={composeEventHandlers(onClick, () => void tour.prev())}
    />
  );
});

const TourClose = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(function TourClose(
  { onClick, ...props },
  ref,
) {
  const { tour } = useTourContext('<Tour.Close>');
  return (
    <Primitive.button
      type="button"
      aria-label={props.children ? undefined : 'Close tour'}
      {...props}
      ref={ref}
      onClick={composeEventHandlers(onClick, () => tour.close())}
    />
  );
});

const TourSkip = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(function TourSkip(
  { onClick, ...props },
  ref,
) {
  const { tour } = useTourContext('<Tour.Skip>');
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      onClick={composeEventHandlers(onClick, () => tour.skip())}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * Progress / Indicators
 * -----------------------------------------------------------------------------------------------*/

export interface TourProgressProps extends Omit<PrimitiveProps<'div'>, 'children'> {
  children?: React.ReactNode | ((progress: TourState['progress']) => React.ReactNode);
}

const TourProgress = React.forwardRef<HTMLDivElement, TourProgressProps>(function TourProgress(
  { children, ...props },
  ref,
) {
  const { state } = useTourContext('<Tour.Progress>');
  const { current, total } = state.progress;
  return (
    <Primitive.div
      data-current={current}
      data-total={total}
      style={{ '--tour-progress': total ? current / total : 0 } as React.CSSProperties}
      {...props}
      ref={ref}
    >
      {typeof children === 'function'
        ? children(state.progress)
        : (children ?? `${current} / ${total}`)}
    </Primitive.div>
  );
});

export interface IndicatorItem {
  id: string;
  index: number;
  status: 'complete' | 'active' | 'upcoming';
  goTo: () => void;
}

export interface TourIndicatorsProps extends Omit<PrimitiveProps<'div'>, 'children'> {
  /** Custom indicator renderer. Default: a button per step. */
  children?: (item: IndicatorItem) => React.ReactNode;
  /** Allow jumping to a step by clicking its indicator. Default: true. */
  navigable?: boolean;
  /** Accessible label for each default indicator. */
  getLabel?: (item: IndicatorItem) => string;
}

const TourIndicators = React.forwardRef<HTMLDivElement, TourIndicatorsProps>(
  function TourIndicators(
    { children, navigable = true, getLabel = (i) => `Go to step ${i.index + 1}`, ...props },
    ref,
  ) {
    const { tour, state } = useTourContext('<Tour.Indicators>');
    // biome-ignore lint/correctness/useExhaustiveDependencies: recompute when the step or data changes
    const visible = React.useMemo(() => tour.getVisibleSteps(), [tour, state.stepId, state.data]);
    const activeIndex = visible.findIndex((s) => s.id === state.stepId);
    const items: IndicatorItem[] = visible.map((s, index) => ({
      id: s.id,
      index,
      status: index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'upcoming',
      goTo: () => void tour.goTo(s.id),
    }));
    return (
      <Primitive.div role="group" aria-label="Tour steps" {...props} ref={ref}>
        {items.map((item) =>
          children ? (
            <React.Fragment key={item.id}>{children(item)}</React.Fragment>
          ) : (
            <button
              key={item.id}
              type="button"
              aria-label={getLabel(item)}
              aria-current={item.status === 'active' ? 'step' : undefined}
              data-state={item.status}
              disabled={!navigable}
              onClick={item.goTo}
            />
          ),
        )}
      </Primitive.div>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Anchor
 * -----------------------------------------------------------------------------------------------*/

export interface TourAnchorProps extends PrimitiveProps<'div'> {
  /** Anchor id to reference with `anchor(id)`. */
  name: string;
}

/** Wraps (or with `asChild`, becomes) a named tour target. */
const TourAnchor = React.forwardRef<HTMLDivElement, TourAnchorProps>(function TourAnchor(
  { name, ...props },
  ref,
) {
  const anchorRef = useTourAnchor<HTMLDivElement>(name);
  const composed = useComposedRefs(ref, anchorRef);
  return <Primitive.div data-tour-anchor={name} {...props} ref={composed} />;
});

/* -----------------------------------------------------------------------------------------------*/

export const Tour = {
  Root: TourRoot,
  Step: TourStep,
  Trigger: TourTrigger,
  Portal,
  Overlay: TourOverlay,
  Spotlight: TourSpotlight,
  Content: TourContent,
  Arrow: TourArrow,
  Title: TourTitle,
  Description: TourDescription,
  StepContent: TourStepContent,
  Next: TourNext,
  Prev: TourPrev,
  Close: TourClose,
  Skip: TourSkip,
  Progress: TourProgress,
  Indicators: TourIndicators,
  Anchor: TourAnchor,
};

export {
  TourAnchor,
  TourArrow,
  TourClose,
  TourContent,
  TourDescription,
  TourIndicators,
  TourNext,
  TourOverlay,
  TourPrev,
  TourProgress,
  TourRoot,
  TourSkip,
  TourSpotlight,
  TourStep,
  TourStepContent,
  TourTitle,
  TourTrigger,
};
