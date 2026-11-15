'use client';

import {
  MotionContent,
  type MotionContentProps,
  MotionOverlay,
  type MotionOverlayProps,
  MotionSpotlight,
  type MotionSpotlightProps,
} from '@awesome-tour/motion';
import { Tour } from '@awesome-tour/react';
import {
  TourCardContents,
  type TourCardContentsProps,
  TourCardFrame,
  type TourCardProps,
  tourCardVariants,
} from '@/components/awesome-tour/tour';
import { cn } from '@/lib/utils';

/** Overlay whose cutout glides between targets with a spring. */
function TourMotionOverlay({ padding = 6, radius = 10, className, ...props }: MotionOverlayProps) {
  return (
    <MotionOverlay
      data-slot="tour-overlay"
      padding={padding}
      radius={radius}
      className={cn('z-50', className)}
      {...props}
    />
  );
}

/** A ring that glides between targets. */
function TourMotionSpotlight({ padding = 6, className, ...props }: MotionSpotlightProps) {
  return (
    <MotionSpotlight
      data-slot="tour-spotlight"
      padding={padding}
      className={cn(
        'z-50 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background',
        'shadow-[0_0_0_6px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]',
        className,
      )}
      {...props}
    />
  );
}

export interface TourMotionCardProps extends MotionContentProps {
  size?: TourCardProps['size'];
  arrow?: boolean;
}

/** `TourCard` animated by motion: spring enter/exit and a cross-fade between steps. */
function TourMotionCard({
  size,
  arrow = true,
  preset = 'slide',
  animateStepChange = true,
  sideOffset = 14,
  collisionPadding = 16,
  className,
  children,
  ...props
}: TourMotionCardProps) {
  return (
    <MotionContent
      data-slot="tour-card"
      preset={preset}
      animateStepChange={animateStepChange}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(tourCardVariants({ size, animated: false }), className)}
      {...props}
    >
      <TourCardFrame size={size} arrow={arrow}>
        {children}
      </TourCardFrame>
    </MotionContent>
  );
}

export interface TourMotionPopoverProps
  extends Omit<TourMotionCardProps, 'children'>,
    TourCardContentsProps {
  /** `overlay` dims the page, `spotlight` only rings the target, `none` renders neither. */
  backdrop?: 'overlay' | 'spotlight' | 'none';
}

/** The complete animated tour UI. */
function TourMotionPopover({
  backdrop = 'overlay',
  progress,
  dots,
  skip,
  children,
  ...props
}: TourMotionPopoverProps) {
  return (
    <Tour.Portal>
      {backdrop === 'overlay' && <TourMotionOverlay />}
      {backdrop === 'spotlight' && <TourMotionSpotlight />}
      <TourMotionCard {...props}>
        <TourCardContents progress={progress} dots={dots} skip={skip}>
          {children}
        </TourCardContents>
      </TourMotionCard>
    </Tour.Portal>
  );
}

export { TourMotionCard, TourMotionOverlay, TourMotionPopover, TourMotionSpotlight };
