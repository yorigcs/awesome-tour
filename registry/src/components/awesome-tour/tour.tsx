'use client';

import {
  Tour,
  type TourContentProps,
  type TourIndicatorsProps,
  type TourOverlayProps,
  type TourSpotlightProps,
  useTourState,
} from '@awesome-tour/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------------------------------
 * Layers
 * -----------------------------------------------------------------------------------------------*/

/** Dims the page with a rounded cutout around the target. Color: `--tour-overlay-color`. */
function TourOverlay({ className, padding = 6, radius = 10, ...props }: TourOverlayProps) {
  return (
    <Tour.Overlay
      data-slot="tour-overlay"
      padding={padding}
      radius={radius}
      className={cn(
        'z-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

/** A ring around the target — use instead of (or on top of) the overlay for non-modal tours. */
function TourSpotlight({ className, padding = 6, ...props }: TourSpotlightProps) {
  return (
    <Tour.Spotlight
      data-slot="tour-spotlight"
      padding={padding}
      className={cn(
        'z-50 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300 ease-out',
        'shadow-[0_0_0_6px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Card
 * -----------------------------------------------------------------------------------------------*/

const tourCardVariants = cva(
  'relative rounded-xl border bg-popover text-popover-foreground shadow-xl outline-hidden origin-(--tour-content-transform-origin)',
  {
    variants: {
      size: {
        default: 'w-[min(22rem,calc(100vw-2rem))] text-sm',
        sm: 'w-[min(18rem,calc(100vw-2rem))] text-sm',
        lg: 'w-[min(28rem,calc(100vw-2rem))] text-sm',
      },
      animated: {
        true: [
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        ],
        false: '',
      },
    },
    defaultVariants: { size: 'default', animated: true },
  },
);

const tourCardInner = {
  default: 'gap-3 p-5 [--tour-card-padding:calc(var(--spacing)*5)]',
  sm: 'gap-2 p-4 [--tour-card-padding:calc(var(--spacing)*4)]',
  lg: 'gap-4 p-6 [--tour-card-padding:calc(var(--spacing)*6)]',
} as const;

export interface TourCardProps extends TourContentProps, VariantProps<typeof tourCardVariants> {
  /** Render the pointer arrow. Default: true. */
  arrow?: boolean;
}

/** The positioned dialog. Compose it with the `TourCard*` parts, or use `<TourPopover />`. */
function TourCard({
  className,
  size,
  animated,
  arrow = true,
  sideOffset = 12,
  collisionPadding = 16,
  children,
  ...props
}: TourCardProps) {
  return (
    <Tour.Content
      data-slot="tour-card"
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(tourCardVariants({ size, animated }), className)}
      {...props}
    >
      <TourCardFrame size={size} arrow={arrow}>
        {children}
      </TourCardFrame>
    </Tour.Content>
  );
}

/**
 * The card's inside: arrow + a padded column that scrolls within the available height (so the
 * arrow, outside the box, is never clipped). Use it inside custom contents such as `MotionContent`.
 */
function TourCardFrame({
  size,
  arrow = true,
  className,
  children,
}: {
  size?: TourCardProps['size'];
  arrow?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      {arrow && <TourCardArrow />}
      <div
        data-slot="tour-card-frame"
        className={cn(
          'flex max-h-(--tour-content-available-height) flex-col overflow-y-auto rounded-[inherit]',
          tourCardInner[size ?? 'default'],
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

function TourCardArrow({ className }: { className?: string }) {
  return (
    <Tour.Arrow
      data-slot="tour-card-arrow"
      width={16}
      height={8}
      className={cn('text-popover drop-shadow-[0_1px_0_var(--color-border)]', className)}
    />
  );
}

function TourCardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tour-card-header"
      className={cn('flex items-center justify-between gap-3', className)}
      {...props}
    />
  );
}

/** "Step 2 of 5" with a thin progress bar. Pass a render function to customize the label. */
function TourCardProgress({
  className,
  label = (current, total) => `Step ${current} of ${total}`,
}: {
  className?: string;
  label?: (current: number, total: number) => React.ReactNode;
}) {
  return (
    <Tour.Progress
      data-slot="tour-card-progress"
      className={cn('flex min-w-0 flex-1 flex-col gap-1.5', className)}
    >
      {({ current, total }) => (
        <>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {label(current, total)}
          </span>
          <span aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-[calc(var(--tour-progress)*100%)] rounded-full bg-primary transition-[width] duration-300 ease-out" />
          </span>
        </>
      )}
    </Tour.Progress>
  );
}

function TourCardClose({
  className,
  label = 'Close tour',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Tour.Close asChild>
      <Button
        data-slot="tour-card-close"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        className={cn('-mt-1 -mr-2 shrink-0 text-muted-foreground', className)}
      >
        <X />
      </Button>
    </Tour.Close>
  );
}

function TourCardMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tour-card-media"
      className={cn(
        '-mx-(--tour-card-padding) -mt-(--tour-card-padding) mb-1 overflow-hidden rounded-t-[inherit] border-b bg-muted [&_img]:w-full [&_video]:w-full',
        className,
      )}
      {...props}
    />
  );
}

function TourCardTitle({ className, ...props }: React.ComponentProps<typeof Tour.Title>) {
  return (
    <Tour.Title
      data-slot="tour-card-title"
      className={cn('text-base leading-snug font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

function TourCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Tour.Description>) {
  return (
    <Tour.Description
      data-slot="tour-card-description"
      className={cn('leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

function TourCardBody({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div data-slot="tour-card-body" className={cn('text-muted-foreground empty:hidden', className)}>
      <Tour.StepContent />
      {children}
    </div>
  );
}

function TourCardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tour-card-footer"
      className={cn('mt-1 flex items-center justify-between gap-2', className)}
      {...props}
    />
  );
}

function TourCardPrev({
  className,
  children = 'Back',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Tour.Prev asChild>
      <Button
        data-slot="tour-card-prev"
        variant="ghost"
        size="sm"
        className={cn('data-disabled:invisible', className)}
      >
        <ArrowLeft />
        {children}
      </Button>
    </Tour.Prev>
  );
}

/** "Next", or "Finish" on the last visible step. */
function TourCardNext({
  className,
  children = 'Next',
  finish = 'Finish',
}: {
  className?: string;
  children?: React.ReactNode;
  finish?: React.ReactNode;
}) {
  const isLast = useTourState((s) => s.progress.current >= s.progress.total);
  return (
    <Tour.Next asChild>
      <Button data-slot="tour-card-next" size="sm" className={className}>
        {isLast ? (
          <>
            {finish}
            <Check />
          </>
        ) : (
          <>
            {children}
            <ArrowRight />
          </>
        )}
      </Button>
    </Tour.Next>
  );
}

function TourCardSkip({
  className,
  children = 'Skip tour',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Tour.Skip asChild>
      <Button
        data-slot="tour-card-skip"
        variant="link"
        size="sm"
        className={cn('px-0 text-muted-foreground', className)}
      >
        {children}
      </Button>
    </Tour.Skip>
  );
}

/** Clickable step dots. */
function TourDots({ className, ...props }: TourIndicatorsProps) {
  return (
    <Tour.Indicators
      data-slot="tour-dots"
      className={cn(
        'flex items-center gap-1.5',
        '[&>button]:size-2 [&>button]:cursor-pointer [&>button]:rounded-full [&>button]:bg-muted-foreground/30 [&>button]:transition-all [&>button]:duration-300',
        '[&>button:hover]:bg-muted-foreground/60 [&>button:focus-visible]:outline-2 [&>button:focus-visible]:outline-offset-2 [&>button:focus-visible]:outline-ring',
        '[&>button[data-state=active]]:w-5 [&>button[data-state=active]]:bg-primary [&>button[data-state=complete]]:bg-primary/50',
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Batteries included
 * -----------------------------------------------------------------------------------------------*/

export interface TourPopoverProps extends Omit<TourCardProps, 'children'> {
  /** Dim the page around the target. Default: true. */
  overlay?: boolean;
  /** Show the progress header. Default: true. */
  progress?: boolean;
  /** Show step dots in the footer instead of the skip link. Default: false. */
  dots?: boolean;
  /** Show a "Skip tour" link in the footer. Default: false. */
  skip?: boolean;
  /** Extra content rendered under the step content (e.g. step-specific actions). */
  children?: React.ReactNode;
}

export interface TourCardContentsProps {
  progress?: boolean;
  dots?: boolean;
  skip?: boolean;
  children?: React.ReactNode;
}

/** The standard layout: progress + close, title, description, step content, navigation. */
function TourCardContents({
  progress = true,
  dots = false,
  skip = false,
  children,
}: TourCardContentsProps) {
  return (
    <>
      <TourCardHeader>
        {progress ? <TourCardProgress /> : <span />}
        <TourCardClose />
      </TourCardHeader>
      <TourCardTitle />
      <TourCardDescription />
      <TourCardBody>{children}</TourCardBody>
      <TourCardFooter>
        {dots ? <TourDots /> : skip ? <TourCardSkip /> : <TourCardPrev />}
        <div className="flex items-center gap-1">
          {(dots || skip) && <TourCardPrev />}
          <TourCardNext />
        </div>
      </TourCardFooter>
    </>
  );
}

/** A complete tour UI: overlay + card with progress, title, description, content and navigation. */
function TourPopover({
  overlay = true,
  progress = true,
  dots = false,
  skip = false,
  children,
  ...props
}: TourPopoverProps) {
  return (
    <Tour.Portal>
      {overlay && <TourOverlay />}
      <TourCard {...props}>
        <TourCardContents progress={progress} dots={dots} skip={skip}>
          {children}
        </TourCardContents>
      </TourCard>
    </Tour.Portal>
  );
}

export {
  TourCard,
  TourCardArrow,
  TourCardBody,
  TourCardClose,
  TourCardContents,
  TourCardDescription,
  TourCardFooter,
  TourCardFrame,
  TourCardHeader,
  TourCardMedia,
  TourCardNext,
  TourCardPrev,
  TourCardProgress,
  TourCardSkip,
  TourCardTitle,
  TourDots,
  TourOverlay,
  TourPopover,
  TourSpotlight,
  tourCardVariants,
};
