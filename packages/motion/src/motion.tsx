import { inflateRect, type RectLike } from '@awesome-tour/core';
import {
  getSpotlightPath,
  type Padding,
  type Side,
  Tour,
  type TourContentProps,
  useComposedRefs,
  useTargetRect,
  useTourContentContext,
  useTourContext,
  useTourLayer,
} from '@awesome-tour/react';
import {
  AnimatePresence,
  type HTMLMotionProps,
  type MotionValue,
  motion,
  type SpringOptions,
  type Transition,
  useAnimate,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import * as React from 'react';

/* -------------------------------------------------------------------------------------------------
 * Presets
 * -----------------------------------------------------------------------------------------------*/

export interface MotionPreset {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
  transition?: Transition;
}

export type PresetName = 'fade' | 'scale' | 'slide' | 'pop';
export type PresetFactory = (side: Side | 'none') => MotionPreset;

const SLIDE: Record<Side | 'none', { x?: number; y?: number }> = {
  top: { y: 8 },
  bottom: { y: -8 },
  left: { x: 8 },
  right: { x: -8 },
  none: { y: 12 },
};

export const tourPresets: Record<PresetName, PresetFactory> = {
  fade: () => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18 },
  }),
  scale: () => ({
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { type: 'spring', stiffness: 420, damping: 32 },
  }),
  slide: (side) => ({
    initial: { opacity: 0, x: 0, y: 0, ...SLIDE[side] },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 0, y: 0, ...SLIDE[side] },
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  }),
  pop: () => ({
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { type: 'spring', stiffness: 520, damping: 22 },
  }),
};

const REDUCED: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 },
};

/* -------------------------------------------------------------------------------------------------
 * Spotlight springs
 * -----------------------------------------------------------------------------------------------*/

export interface SpotlightSprings {
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: MotionValue<number>;
  height: MotionValue<number>;
}

const DEFAULT_SPRING: SpringOptions = { stiffness: 260, damping: 30, mass: 0.9 };

function viewportCenter(): RectLike {
  const w = typeof window !== 'undefined' ? window.innerWidth : 0;
  const h = typeof window !== 'undefined' ? window.innerHeight : 0;
  return {
    x: w / 2,
    y: h / 2,
    width: 0,
    height: 0,
    top: h / 2,
    left: w / 2,
    right: w / 2,
    bottom: h / 2,
  };
}

/**
 * Springs that follow the target rect. When the step has no target the hole shrinks to the
 * viewport center, so moving between anchored and centered steps is continuous.
 */
export function useSpotlightSprings(
  rect: RectLike | null,
  options: { padding?: Padding; spring?: SpringOptions } = {},
): SpotlightSprings {
  const reduced = useReducedMotion();
  const config = reduced ? { stiffness: 2000, damping: 100 } : (options.spring ?? DEFAULT_SPRING);
  const x = useSpring(0, config);
  const y = useSpring(0, config);
  const width = useSpring(0, config);
  const height = useSpring(0, config);
  const initialized = React.useRef(false);
  const padding = options.padding ?? 4;
  const paddingKey = JSON.stringify(padding);

  // biome-ignore lint/correctness/useExhaustiveDependencies: padding tracked via paddingKey
  React.useLayoutEffect(() => {
    const target = rect ? inflateRect(rect, padding) : viewportCenter();
    if (!initialized.current) {
      initialized.current = true;
      x.jump(target.x);
      y.jump(target.y);
      width.jump(target.width);
      height.jump(target.height);
      return;
    }
    x.set(target.x);
    y.set(target.y);
    width.set(target.width);
    height.set(target.height);
  }, [rect, paddingKey, x, y, width, height]);

  return { x, y, width, height };
}

/* -------------------------------------------------------------------------------------------------
 * MotionOverlay
 * -----------------------------------------------------------------------------------------------*/

export interface MotionOverlayProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  padding?: Padding;
  radius?: number;
  spring?: SpringOptions;
}

/** Overlay whose cutout morphs between targets with a spring instead of jumping. */
export const MotionOverlay = React.forwardRef<HTMLDivElement, MotionOverlayProps>(
  function MotionOverlay(props, ref) {
    const { open } = useTourContext('<MotionOverlay>');
    return (
      <AnimatePresence>
        {open && <MotionOverlayImpl key="tour-overlay" {...props} ref={ref} />}
      </AnimatePresence>
    );
  },
);

const MotionOverlayImpl = React.forwardRef<HTMLDivElement, MotionOverlayProps>(
  function MotionOverlayImpl({ padding = 4, radius = 4, spring, style, onClick, ...props }, ref) {
    const ctx = useTourContext('<MotionOverlay>');
    const rect = useTargetRect();
    const springs = useSpotlightSprings(rect, { padding, ...(spring ? { spring } : {}) });
    const d = useTransform(() =>
      getSpotlightPath(
        rect || springs.width.get() > 0.5
          ? {
              x: springs.x.get(),
              y: springs.y.get(),
              width: springs.width.get(),
              height: springs.height.get(),
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }
          : null,
        radius,
      ),
    );
    const layerRef = useTourLayer();
    const composed = useComposedRefs<HTMLDivElement>(ref, layerRef as React.Ref<HTMLDivElement>);
    const reduced = useReducedMotion();

    return (
      <motion.div
        aria-hidden="true"
        data-state={ctx.open ? 'open' : 'closed'}
        data-tour-overlay=""
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.1 : 0.25 }}
        {...props}
        ref={composed}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', ...style }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          aria-hidden="true"
        >
          <motion.path
            d={d}
            fillRule="evenodd"
            style={{ fill: 'var(--tour-overlay-color, rgb(0 0 0 / 0.5))', pointerEvents: 'auto' }}
            onClick={(event) => {
              onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
              if (!event.defaultPrevented && ctx.closeOnOverlayClick) ctx.tour.close();
            }}
          />
          {rect && !ctx.interactive && (
            <motion.rect
              x={springs.x}
              y={springs.y}
              width={springs.width}
              height={springs.height}
              fill="transparent"
              style={{ pointerEvents: 'auto' }}
            />
          )}
        </svg>
      </motion.div>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * MotionSpotlight
 * -----------------------------------------------------------------------------------------------*/

export interface MotionSpotlightProps extends HTMLMotionProps<'div'> {
  padding?: Padding;
  spring?: SpringOptions;
}

/** A ring/box that glides between targets. Style it freely (border, box-shadow, glow). */
export const MotionSpotlight = React.forwardRef<HTMLDivElement, MotionSpotlightProps>(
  function MotionSpotlight(props, ref) {
    const { open, state } = useTourContext('<MotionSpotlight>');
    return (
      <AnimatePresence>
        {open && state.targets.length > 0 && (
          <MotionSpotlightImpl key="tour-spotlight" {...props} ref={ref} />
        )}
      </AnimatePresence>
    );
  },
);

const MotionSpotlightImpl = React.forwardRef<HTMLDivElement, MotionSpotlightProps>(
  function MotionSpotlightImpl({ padding = 4, spring, style, ...props }, ref) {
    const rect = useTargetRect();
    const springs = useSpotlightSprings(rect, { padding, ...(spring ? { spring } : {}) });
    return (
      <motion.div
        aria-hidden="true"
        data-tour-spotlight=""
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        {...props}
        ref={ref}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          top: 0,
          left: 0,
          x: springs.x,
          y: springs.y,
          width: springs.width,
          height: springs.height,
          ...style,
        }}
      />
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * MotionContent
 * -----------------------------------------------------------------------------------------------*/

export interface MotionContentProps extends Omit<TourContentProps, 'forceMount' | 'asChild'> {
  /** Animation preset or a factory receiving the placed side. Default: 'scale'. */
  preset?: PresetName | PresetFactory;
  /** Override the preset's transition. */
  transition?: Transition;
  /** Re-run the enter animation on every step change. Default: false. */
  animateStepChange?: boolean;
}

/** `Tour.Content` with enter/exit animations powered by motion. */
export const MotionContent = React.forwardRef<HTMLDivElement, MotionContentProps>(
  function MotionContent(
    { preset = 'scale', transition, animateStepChange = false, children, ...props },
    ref,
  ) {
    const { open, state } = useTourContext('<MotionContent>');
    return (
      <AnimatePresence>
        {open && (
          <Tour.Content key="tour-content" forceMount asChild {...props} ref={ref}>
            <MotionPanel
              preset={preset}
              transition={transition}
              stepKey={animateStepChange ? (state.stepId ?? undefined) : undefined}
            >
              {children}
            </MotionPanel>
          </Tour.Content>
        )}
      </AnimatePresence>
    );
  },
);

interface MotionPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  preset: PresetName | PresetFactory;
  transition?: Transition;
  stepKey?: string;
}

const MotionPanel = React.forwardRef<HTMLDivElement, MotionPanelProps>(function MotionPanel(
  { preset, transition, stepKey, children, style, ...props },
  ref,
) {
  const { placedSide } = useTourContentContext();
  const reduced = useReducedMotion();
  const factory = typeof preset === 'function' ? preset : tourPresets[preset];
  const p = reduced ? REDUCED : factory(placedSide);
  const motionProps = props as unknown as HTMLMotionProps<'div'>;
  // Step changes animate in place (no remount): controls keep focus and are never duplicated.
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const firstStep = React.useRef(true);
  React.useEffect(() => {
    if (stepKey === undefined) return;
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    if (!reduced && scope.current) animate(scope.current, { opacity: [0, 1] }, { duration: 0.2 });
  }, [stepKey, reduced, animate, scope]);
  return (
    <motion.div
      {...motionProps}
      ref={ref}
      initial={p.initial}
      animate={p.animate}
      exit={p.exit}
      transition={transition ?? p.transition}
      style={{ transformOrigin: 'var(--tour-content-transform-origin)', ...(style as object) }}
    >
      <div ref={scope}>{children}</div>
    </motion.div>
  );
});
