import {
  createTour,
  createVirtualTarget,
  inertOthers,
  inflateRect,
  isElement,
  isFromKeptElement,
  lockScroll,
  prefersReducedMotion,
  type RectLike,
  type StartOptions,
  type Tour as TourInstance,
  type TourPlugin,
  type TourState,
  type TourTargetNode,
} from '@awesome-tour/core';
import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  createContentStore,
  defaultKeyMap,
  type ReactStepDefinition,
  type StepRenderProps,
  TourContext,
  type TourContextValue,
  type TourKeyMap,
  useTourContext,
  useTourProvider,
} from './context';
import { useTargetRect, useTargetRects, useTourAnchor, useTourSelector } from './hooks';
import {
  LocaleScope,
  MessagesScope,
  type TourMessagesInput,
  useLocalize,
  useTourMessages,
} from './messages';
import { composeEventHandlers, useComposedRefs } from './utils/compose';
import {
  getTabbables,
  ownsKeys,
  useCallbackRef,
  useIsMounted,
  useIsomorphicLayoutEffect,
  useKeyboardOwner,
  visuallyHidden,
} from './utils/hooks';
import {
  type Align,
  type PhysicalSide,
  type PositionerOptions,
  type Side,
  usePositioner,
} from './utils/positioner';
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
  /**
   * Reading direction for placement and arrow keys. Default: the document's (`<html dir>`, or the
   * computed `direction`), read each time the tour opens.
   */
  dir?: 'ltr' | 'rtl';
  /**
   * Keyboard navigation: ←/→ for next/previous (mirrored in RTL), Home/End for first/last.
   * `false` disables it; an object remaps keys (`{ next: ['ArrowRight', 'j'] }`). Default: true.
   */
  keyboardNavigation?: boolean | Partial<TourKeyMap>;
  /** Lock page scrolling while a modal step is open (the tour still scrolls targets into view). */
  lockScroll?: boolean;
  /**
   * Morph the card between steps with the View Transitions API (`view-transition-name:
   * tour-content`). No-op where unsupported or with reduced motion. Default: false.
   */
  viewTransition?: boolean;
  /** Escape closes the tour. Default: true. */
  closeOnEscape?: boolean;
  /** Clicking the overlay closes the tour. Default: false. */
  closeOnOverlayClick?: boolean;
  /** Return focus to the previously focused element when the tour closes. Default: true. */
  restoreFocus?: boolean;
  /** Screen reader announcement on step change. `false` disables it. Default: `messages.stepOf`. */
  announce?:
    | false
    | ((info: { state: TourState; step: ReactStepDefinition | undefined }) => string);
  /** Translations for the strings this tour's parts render (merged over inherited messages). */
  messages?: TourMessagesInput;
  /**
   * Locale for step content given per locale (`title: { en, pt }`). Default: the provider's, else
   * `<html lang>`.
   */
  locale?: string;
  children?: React.ReactNode;
}

function hasEventAdvance(step: ReactStepDefinition | undefined) {
  if (!step?.advanceOn) return false;
  const rules = Array.isArray(step.advanceOn) ? step.advanceOn : [step.advanceOn];
  return rules.some((r) => !!r.event && !r.target);
}

const destroyTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

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
    dir: dirProp,
    keyboardNavigation = true,
    lockScroll: lockScrollProp = false,
    viewTransition = false,
    closeOnEscape = true,
    closeOnOverlayClick = false,
    restoreFocus = true,
    announce,
    messages,
    locale,
    children,
  } = props;

  const provider = useTourProvider();
  const generatedId = React.useId();
  // Inline tours are created without plugins: render must stay side-effect free (StrictMode may
  // discard this render). Plugins attach in an effect, before the tour can start.
  const [inlineTour] = React.useState(() =>
    tourProp || tourId
      ? null
      : createTour({
          id: id ?? `tour${generatedId}`,
          steps: steps ?? [],
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

  const initialPlugins = React.useRef(plugins);
  React.useEffect(() => {
    if (!inlineTour) return;
    const detach = (initialPlugins.current ?? []).map((plugin) => inlineTour.use(plugin));
    return () => {
      for (const off of detach) off();
    };
  }, [inlineTour]);

  // An inline tour dies with its Root. Deferred so StrictMode's simulated unmount/remount (which
  // re-runs this effect right away) doesn't tear it down.
  React.useEffect(() => {
    if (!inlineTour) return;
    const pending = destroyTimers.get(inlineTour);
    if (pending) clearTimeout(pending);
    return () => {
      destroyTimers.set(
        inlineTour,
        setTimeout(() => inlineTour.destroy(), 0),
      );
    };
  }, [inlineTour]);

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
  // Bumped when steps are re-synced so parts reading step fields (Title, Content…) re-render.
  const [, setStepsVersion] = React.useState(0);
  const syncSteps = React.useCallback(() => {
    tour.setSteps([...(configSteps.current ?? []), ...declared.current.map((get) => get())]);
    setStepsVersion((v) => v + 1);
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
  const dir = useDocumentDir(dirProp, open);
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

  /* Scroll lock -------------------------------------------------------------------------------*/
  React.useEffect(() => {
    if (!lockScrollProp || !open || !modal) return;
    return lockScroll();
  }, [lockScrollProp, open, modal]);

  /* View transitions between steps ------------------------------------------------------------*/
  React.useEffect(() => {
    if (!viewTransition) return;
    return tour.on('stepLeave', () => startStepTransition(tour));
  }, [tour, viewTransition]);

  const keyMap = React.useMemo<TourKeyMap | null>(
    () =>
      keyboardNavigation === false
        ? null
        : keyboardNavigation === true
          ? defaultKeyMap
          : { ...defaultKeyMap, ...keyboardNavigation },
    [keyboardNavigation],
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
    keyMap,
    viewTransition,
    closeOnEscape,
    closeOnOverlayClick,
    contentId,
    contents,
    registerStep,
    syncSteps,
    registerLayer,
    layers,
    layersVersion,
  };

  return (
    <MessagesScope messages={messages}>
      <LocaleScope locale={locale}>
        <TourContext.Provider value={value}>
          {children}
          {announce !== false && (
            <Announcer announce={announce} open={open} state={state} step={step} />
          )}
        </TourContext.Provider>
      </LocaleScope>
    </MessagesScope>
  );
}

/** `dir` prop, else the document's direction (re-read when the tour opens). */
function useDocumentDir(dirProp: 'ltr' | 'rtl' | undefined, open: boolean): 'ltr' | 'rtl' {
  const [docDir, setDocDir] = React.useState<'ltr' | 'rtl'>('ltr');
  useIsomorphicLayoutEffect(() => {
    if (dirProp || !open) return;
    const root = document.documentElement;
    const attr = (document.body?.getAttribute('dir') || root.getAttribute('dir'))?.toLowerCase();
    const next =
      attr === 'rtl' || attr === 'ltr'
        ? attr
        : getComputedStyle(root).direction === 'rtl'
          ? 'rtl'
          : 'ltr';
    setDocDir(next);
  }, [dirProp, open]);
  return dirProp ?? docDir;
}

function Announcer({
  announce,
  open,
  state,
  step,
}: {
  announce: TourRootProps['announce'];
  open: boolean;
  state: TourState;
  step: ReactStepDefinition | undefined;
}) {
  const { stepOf } = useTourMessages();
  const format =
    announce ||
    (({ state: s }: { state: TourState }) => stepOf(s.progress.current, s.progress.total));
  return (
    <div aria-live="polite" aria-atomic="true" style={visuallyHidden} data-tour-announcer="">
      {open ? format({ state, step }) : ''}
    </div>
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
const STEP_CALLBACKS = ['when', 'beforeEnter', 'afterLeave', 'beforeLeave', 'canNext'] as const;

function TourStep({ children, ...definition }: TourStepProps) {
  const { registerStep, syncSteps, contents } = useTourContext('<Tour.Step>');
  const latest = React.useRef(definition);
  latest.current = definition;
  const { id } = definition;

  // Callbacks are stable wrappers over the latest props: inline functions never go stale, and
  // re-renders don't look like step changes.
  const callbacks = React.useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const key of STEP_CALLBACKS) {
      out[key] = (...args: unknown[]) =>
        (latest.current[key] as ((...a: unknown[]) => unknown) | undefined)?.(...args);
    }
    out.next = (ctx: unknown) =>
      (latest.current.next as (c: unknown) => string | null | undefined)(ctx);
    return out;
  }, []);

  const build = React.useCallback((): ReactStepDefinition => {
    const d = latest.current;
    const step: Record<string, unknown> = { ...d };
    for (const key of STEP_CALLBACKS) if (d[key]) step[key] = callbacks[key];
    if (typeof d.next === 'function') step.next = callbacks.next;
    return step as unknown as ReactStepDefinition;
  }, [callbacks]);

  // Re-registers only when the id changes: `build` reads the latest props itself.
  useIsomorphicLayoutEffect(() => registerStep(build), [id, registerStep, build]);

  // Any other prop change (target, route, title, side, advanceOn…) is pushed to the tour.
  const synced = React.useRef(definition);
  useIsomorphicLayoutEffect(() => {
    const prev = synced.current;
    synced.current = definition;
    if (prev === definition) return;
    const keys = new Set([...Object.keys(prev), ...Object.keys(definition)]);
    for (const key of keys) {
      const a = prev[key as keyof typeof prev];
      const b = definition[key as keyof typeof definition];
      if (typeof a === 'function' && typeof b === 'function' && key !== 'next') continue;
      if (!Object.is(a, b)) {
        syncSteps();
        return;
      }
    }
  });

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
  /** Where to render. Default: `document.body` (or the modal dialog holding the target). */
  container?: Element | DocumentFragment | null;
  /**
   * `auto` (default): like `body`, unless the step's target sits inside a modal dialog (`<dialog>`
   * opened with `showModal()`, or an `aria-modal` dialog such as Radix/vaul) — then the tour renders
   * inside that dialog, in the top layer where supported, so it is above it, clickable, and inside
   * its focus scope. `body`: a regular portal, stacked with `z-index`. `top-layer`: render inside a
   * manual popover in the browser's top layer, above every z-index and stacking context (and above
   * modal `<dialog>`s opened before it). Falls back to `body` where the Popover API is missing.
   */
  strategy?: 'auto' | 'body' | 'top-layer';
  children?: React.ReactNode;
}

const supportsPopover = () =>
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/**
 * Dialogs a target can live in. Radix and vaul don't set `aria-modal` (they hide the rest with
 * `aria-hidden` and `pointer-events: none` on <body>), so any open dialog role counts: rendering
 * inside a non-modal one is harmless (the top layer escapes its clipping and stacking).
 */
const MODAL_HOST = 'dialog[open], [aria-modal="true"], [role="dialog"], [role="alertdialog"]';

/** The open modal dialog containing one of `targets`, if any (shadow DOM aware). */
export function findModalHost(targets: readonly TourTargetNode[]): Element | null {
  for (const target of targets) {
    let node: Element | null = isElement(target) ? target : (target.contextElement ?? null);
    while (node) {
      const host: Element | null = node.closest(MODAL_HOST);
      // Another tour's card isn't a host (a hint pointing into an open tour step).
      if (host && !host.closest('[data-tour-content-wrapper]')) return host;
      const root = node.getRootNode();
      node = root instanceof ShadowRoot ? root.host : null;
    }
  }
  return null;
}

export function Portal({ container, strategy = 'auto', children }: PortalProps) {
  const mounted = useIsMounted();
  const tourCtx = React.useContext(TourContext);
  const targets = tourCtx?.state.targets;
  const host = React.useMemo(
    () => (strategy === 'auto' && !container && targets ? findModalHost(targets) : null),
    [strategy, container, targets],
  );
  const useTopLayer = (strategy === 'top-layer' || !!host) && supportsPopover();
  const parent = container ?? host;
  const [layer, setLayer] = React.useState<HTMLElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!useTopLayer) return;
    const el = document.createElement('div');
    el.setAttribute('popover', 'manual');
    el.setAttribute('data-tour-top-layer', '');
    // A zero-size box at the viewport origin: fixed-position children (overlay, positioned
    // content) lay out against the viewport, and the layer itself never blocks clicks.
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0 auto auto 0',
      width: '0',
      height: '0',
      margin: '0',
      padding: '0',
      border: '0',
      background: 'transparent',
      overflow: 'visible',
      color: 'inherit',
      pointerEvents: 'auto',
    });
    (parent ?? document.body).appendChild(el);
    (el as HTMLElement & { showPopover(): void }).showPopover();
    setLayer(el);
    return () => {
      el.remove();
      setLayer(null);
    };
  }, [useTopLayer, parent]);
  if (!mounted) return null;
  if (useTopLayer) return layer ? createPortal(children, layer) : null;
  const target = parent ?? globalThis.document?.body;
  return target ? createPortal(children, target) : null;
}

/* -------------------------------------------------------------------------------------------------
 * Overlay
 * -----------------------------------------------------------------------------------------------*/

export type Padding = number | Partial<Record<Side, number>>;

export type CutoutShape = 'rect' | 'circle';

function holePath(rect: RectLike, radius: number, shape: CutoutShape): string {
  const { x, y, width: w, height: h } = rect;
  if (shape === 'circle') {
    // The circle that circumscribes the rect, so the whole target stays visible.
    const r = Math.hypot(w, h) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  }
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/**
 * SVG path covering the whole viewport with one hole per rect (even-odd fill): rounded rects by
 * default, or circles around each rect with `shape: 'circle'`.
 */
export function getSpotlightPath(
  rects: RectLike | readonly RectLike[] | null,
  radius = 0,
  shape: CutoutShape = 'rect',
): string {
  const outer = 'M-99999 -99999H99999V99999H-99999Z';
  const list = rects == null ? [] : Array.isArray(rects) ? rects : [rects as RectLike];
  return outer + list.map((r) => holePath(r, radius, shape)).join('');
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
  /**
   * `union` (default): one cutout around all targets of the step. `each`: one cutout per target,
   * so the page between them stays dimmed.
   */
  cutout?: 'union' | 'each';
  /** `rect` (default, rounded by `radius`) or `circle` around each cutout. */
  shape?: CutoutShape;
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
  function TourOverlayImpl(
    {
      padding = 4,
      radius = 4,
      cutout: cutoutMode = 'union',
      shape = 'rect',
      style,
      onClick,
      children,
      ...props
    },
    ref,
  ) {
    const ctx = useTourContext('<Tour.Overlay>');
    const rect = useTargetRect();
    const rects = useTargetRects(cutoutMode === 'each');
    const layerRef = useTourLayer();
    const composedRef = useComposedRefs(ref, layerRef as React.Ref<HTMLDivElement>);
    const cutout = rect ? inflateRect(rect, padding) : null;
    const holes =
      cutoutMode === 'each' && rects.length > 0
        ? rects.map((r) => inflateRect(r, padding))
        : cutout
          ? [cutout]
          : [];
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
            d={getSpotlightPath(holes, radius, shape)}
            fillRule="evenodd"
            style={{ fill: 'var(--tour-overlay-color, rgb(0 0 0 / 0.5))', pointerEvents: 'auto' }}
            onClick={handleClick as unknown as React.MouseEventHandler<SVGPathElement>}
          />
          {!ctx.interactive &&
            holes.map((hole, i) => (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: holes have no identity; two may share a corner
                key={i}
                x={hole.x}
                y={hole.y}
                width={hole.width}
                height={hole.height}
                fill="transparent"
                style={{ pointerEvents: 'auto' }}
              />
            ))}
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

export interface ContentContextValue {
  placedSide: PhysicalSide | 'none';
  placedAlign: Align;
  setArrow: (node: HTMLElement | null) => void;
  arrowX?: number;
  arrowY?: number;
  shouldHideArrow: boolean;
  setTitleId: (id: string | undefined) => void;
  setDescriptionId: (id: string | undefined) => void;
}

/** @internal Shared with the surfaces entry (announcements, surveys). */
export const ContentContext = React.createContext<ContentContextValue | null>(null);

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
  /**
   * `popover` (default): next to the target. `sheet`: docked to the bottom edge of the viewport,
   * full width (no arrow), the way mobile apps show hints. `auto`: a sheet below
   * `sheetBreakpoint`, a popover above it. Exposed as `data-layout`.
   */
  layout?: 'popover' | 'sheet' | 'auto';
  /** Viewport width (px) under which `layout="auto"` becomes a sheet. Default: 640. */
  sheetBreakpoint?: number;
}

function useMediaQuery(query: string | null): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (!query || typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () =>
      query && typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}

/** Maps a key to a tour action. In RTL, the keys bound to next/prev swap (→ goes back). */
export function keyAction(
  keys: TourKeyMap,
  key: string,
  dir: 'ltr' | 'rtl' = 'ltr',
): 'next' | 'prev' | 'first' | 'last' | null {
  const mirror = (k: string) =>
    dir === 'rtl' ? ({ ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' }[k] ?? k) : k;
  const pressed = mirror(key);
  if (keys.next.includes(pressed)) return 'next';
  if (keys.prev.includes(pressed)) return 'prev';
  if (keys.first.includes(key)) return 'first';
  if (keys.last.includes(key)) return 'last';
  return null;
}

/**
 * Wraps the next step commit in `document.startViewTransition`. The old frame is held only until
 * the new step is ready (or 300ms, so a slow target never freezes the page).
 */
function startStepTransition(tour: TourInstance<any, any>) {
  const doc = globalThis.document as
    | (Document & { startViewTransition?: (cb: () => Promise<void>) => unknown })
    | undefined;
  if (!doc?.startViewTransition || prefersReducedMotion()) return;
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          off();
          // Let React commit the new step before the "after" snapshot is taken.
          requestAnimationFrame(() => resolve());
        };
        const timer = setTimeout(done, 300);
        const off = tour.subscribe(() => {
          const { phase, status } = tour.getState();
          if (phase === 'ready' || status !== 'active') done();
        });
      }),
  );
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
      layout = 'popover',
      sheetBreakpoint = 640,
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
    const isKeyboardOwner = useKeyboardOwner(open);
    React.useEffect(() => {
      if (!open) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.defaultPrevented || isFromKeptElement(event) || !isKeyboardOwner()) return;
        if (event.key === 'Escape') {
          handleEscape(event);
          if (!event.defaultPrevented && ctx.closeOnEscape) {
            event.preventDefault();
            tour.close();
          }
          return;
        }
        const keys = ctx.keyMap;
        if (!keys || ownsKeys(event)) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const action = keyAction(keys, event.key, dir);
        if (!action) return;
        event.preventDefault();
        if (action === 'next') void tour.next();
        else if (action === 'prev') void tour.prev();
        else {
          const visible = tour.getVisibleSteps();
          const target = action === 'first' ? visible[0] : visible[visible.length - 1];
          if (target && target.id !== tour.getState().stepId) void tour.goTo(target.id);
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, tour, dir, ctx.closeOnEscape, ctx.keyMap, handleEscape, isKeyboardOwner]);

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

    const narrow = useMediaQuery(
      layout === 'auto' ? `(max-width: ${sheetBreakpoint - 1}px)` : null,
    );
    const sheet = layout === 'sheet' || (layout === 'auto' && narrow);
    const placedSide = centered || sheet ? 'none' : positioner.placedSide;
    const wrapperStyle: React.CSSProperties = sheet
      ? { position: 'fixed', left: 0, right: 0, bottom: 0 }
      : centered
        ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        : {
            ...positioner.floatingStyles,
            transform: positioner.isPositioned
              ? positioner.floatingStyles.transform
              : 'translate(0, -200%)',
            visibility: positioner.isReferenceHidden ? 'hidden' : undefined,
          };

    // `advanceOn: { delay }` → expose the duration so CSS can draw a countdown.
    const autoAdvance = React.useMemo(() => {
      const rules = step?.advanceOn;
      const list = rules ? (Array.isArray(rules) ? rules : [rules]) : [];
      const delays = list.map((r) => r.delay).filter((d): d is number => d != null);
      return delays.length ? Math.min(...delays) : null;
    }, [step]);

    const cssVars = {
      '--tour-auto-advance': autoAdvance != null ? `${autoAdvance}ms` : undefined,
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
      shouldHideArrow: centered || sheet || positioner.shouldHideArrow,
      setTitleId,
      setDescriptionId,
    };

    return (
      <div
        ref={wrapperRef}
        data-tour-content-wrapper=""
        dir={dir}
        style={{
          ...wrapperStyle,
          ...cssVars,
          ...(ctx.viewTransition
            ? ({ viewTransitionName: 'tour-content' } as React.CSSProperties)
            : {}),
        }}
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
            data-placement={sheet ? 'sheet' : centered ? 'center' : 'anchored'}
            data-layout={sheet ? 'sheet' : 'popover'}
            data-preview={tour.preview ? '' : undefined}
            data-step={state.stepId ?? undefined}
            data-phase={state.phase ?? undefined}
            data-direction={state.direction ?? undefined}
            data-target-missing={state.targetMissing ? '' : undefined}
            data-auto-advance={autoAdvance != null ? '' : undefined}
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

const OPPOSITE: Record<PhysicalSide, PhysicalSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

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
  const localizeNode = useLocalize();
  const content = useTourContentContext();
  const id = useRegisteredId(content.setTitleId, idProp);
  return (
    <Primitive.h2 id={id} {...props} ref={ref}>
      {children ?? localizeNode(step?.title)}
    </Primitive.h2>
  );
});

const TourDescription = React.forwardRef<HTMLParagraphElement, PrimitiveProps<'p'>>(
  function TourDescription({ children, id: idProp, ...props }, ref) {
    const { step } = useTourContext('<Tour.Description>');
    const localizeNode = useLocalize();
    const content = useTourContentContext();
    const id = useRegisteredId(content.setDescriptionId, idProp);
    return (
      <Primitive.p id={id} {...props} ref={ref}>
        {children ?? localizeNode(step?.description)}
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
  const localizeNode = useLocalize();
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
  else
    node =
      typeof step.content === 'function' ? step.content(renderProps) : localizeNode(step.content);
  return <React.Suspense fallback={fallback}>{node}</React.Suspense>;
}

/* -------------------------------------------------------------------------------------------------
 * Navigation buttons
 * -----------------------------------------------------------------------------------------------*/

const TourNext = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(function TourNext(
  { onClick, disabled, ...props },
  ref,
) {
  const { tour, state } = useTourContext('<Tour.Next>');
  const isLast = state.progress.current >= state.progress.total;
  // A step's `canNext` predicate gates moving forward.
  const blocked = disabled ?? !state.canNext;
  return (
    <Primitive.button
      type="button"
      data-tour-next=""
      data-last={isLast ? '' : undefined}
      disabled={blocked}
      data-disabled={blocked ? '' : undefined}
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
      data-tour-prev=""
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
  const { closeTour } = useTourMessages();
  return (
    <Primitive.button
      type="button"
      data-tour-close=""
      aria-label={props.children ? undefined : closeTour}
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
      data-tour-skip=""
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
  function TourIndicators({ children, navigable = true, getLabel, ...props }, ref) {
    const { tour, state } = useTourContext('<Tour.Indicators>');
    const messages = useTourMessages();
    const labelFor = getLabel ?? ((i: IndicatorItem) => messages.goToStep(i.index + 1));
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
      <Primitive.div role="group" aria-label={messages.tourSteps} {...props} ref={ref}>
        {items.map((item) =>
          children ? (
            <React.Fragment key={item.id}>{children(item)}</React.Fragment>
          ) : (
            <button
              key={item.id}
              type="button"
              aria-label={labelFor(item)}
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
