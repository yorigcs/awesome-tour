import { inertOthers } from '@awesome-tour/core';
import * as React from 'react';
import { useTourContext } from '../context';
import { ContentContext, type ContentContextValue } from '../tour';
import { composeEventHandlers, useComposedRefs } from '../utils/compose';
import { getTabbables, useCallbackRef } from '../utils/hooks';
import { Presence } from '../utils/presence';
import { Primitive, type PrimitiveProps } from '../utils/primitive';

/**
 * How a surface presents itself.
 * - `banner`: an inline or edge strip (`role="region"`), never takes focus.
 * - `toast`: a polite live notification (`role="status"`), never takes focus.
 * - `slideout`: a non-modal panel (`role="dialog"`), takes focus, Escape closes.
 * - `modal`: a blocking dialog: focus trap, `inert` page, Escape closes.
 */
export type SurfaceVariant = 'banner' | 'toast' | 'slideout' | 'modal';

export const surfaceVariantOf = (meta: Record<string, unknown> | undefined): SurfaceVariant =>
  (meta?.variant as SurfaceVariant | undefined) ?? 'banner';

export interface SurfaceContentProps extends PrimitiveProps<'div'> {
  forceMount?: boolean;
  /** Called on Escape (slideout/modal). `event.preventDefault()` keeps it open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

const noop = () => {};

/**
 * The element of an announcement or survey. Not positioned: place it with CSS (a top banner, a
 * corner toast, a side panel, a centered modal). Semantics and focus follow the variant.
 */
export const SurfaceContent = React.forwardRef<HTMLDivElement, SurfaceContentProps>(
  function SurfaceContent({ forceMount, ...props }, ref) {
    const { open } = useTourContext('<Surface.Content>');
    return (
      <Presence present={forceMount || open}>
        <SurfaceContentImpl {...props} ref={ref} />
      </Presence>
    );
  },
);

const SurfaceContentImpl = React.forwardRef<
  HTMLDivElement,
  Omit<SurfaceContentProps, 'forceMount'>
>(function SurfaceContentImpl({ onEscapeKeyDown, onKeyDown, ...props }, ref) {
  const ctx = useTourContext('<Surface.Content>');
  const { tour, open, state, layers, layersVersion } = ctx;
  const variant = surfaceVariantOf(ctx.step?.meta);
  const isDialog = variant === 'modal' || variant === 'slideout';
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const composed = useComposedRefs(ref, setNode);
  const [titleId, setTitleId] = React.useState<string>();
  const [descriptionId, setDescriptionId] = React.useState<string>();
  const handleEscape = useCallbackRef(onEscapeKeyDown);

  // Dialogs take focus on every step (surveys move question to question).
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus when the step changes
  React.useEffect(() => {
    if (!isDialog || !open || !node) return;
    if (!node.contains(document.activeElement)) node.focus({ preventScroll: true });
  }, [isDialog, open, node, state.stepId]);

  React.useEffect(() => {
    if (!isDialog || !open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      handleEscape(event);
      if (event.defaultPrevented || !ctx.closeOnEscape) return;
      event.preventDefault();
      tour.close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDialog, open, tour, ctx.closeOnEscape, handleEscape]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `layersVersion` tracks the mutable set
  React.useEffect(() => {
    if (variant !== 'modal' || !open || !node) return;
    return inertOthers([node, ...layers]);
  }, [variant, open, node, layers, layersVersion]);

  const handleKeyDown = composeEventHandlers(onKeyDown, (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || variant !== 'modal' || !node) return;
    const tabbables = getTabbables(node);
    if (tabbables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = tabbables[0]!;
    const last = tabbables[tabbables.length - 1]!;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const content: ContentContextValue = {
    placedSide: 'none',
    placedAlign: 'center',
    setArrow: noop,
    shouldHideArrow: true,
    setTitleId,
    setDescriptionId,
  };

  const role = isDialog ? 'dialog' : variant === 'toast' ? 'status' : 'region';
  return (
    <ContentContext.Provider value={content}>
      <Primitive.div
        role={role}
        aria-modal={variant === 'modal' || undefined}
        aria-labelledby={role === 'status' ? undefined : titleId}
        aria-describedby={role === 'status' ? undefined : descriptionId}
        aria-live={role === 'status' ? 'polite' : undefined}
        tabIndex={isDialog ? -1 : undefined}
        data-variant={variant}
        data-state={open ? 'open' : 'closed'}
        data-step={state.stepId ?? undefined}
        data-direction={state.direction ?? undefined}
        {...props}
        ref={composed}
        onKeyDown={handleKeyDown}
        style={{ outline: 'none', ...props.style }}
      />
    </ContentContext.Provider>
  );
});
