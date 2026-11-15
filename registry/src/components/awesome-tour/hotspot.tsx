'use client';

import {
  Hotspot,
  type HotspotBeaconProps,
  type HotspotContentProps,
  type HotspotRootProps,
} from '@awesome-tour/react';
import { X } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** A pulsing dot pinned to the target's corner. */
function HotspotBeacon({
  className,
  label = 'Show hint',
  ...props
}: HotspotBeaconProps & { /** Accessible name of the beacon button. */ label?: string }) {
  return (
    <Hotspot.Beacon
      data-slot="hotspot-beacon"
      aria-label={label}
      className={cn(
        'group/beacon z-40 flex size-4 cursor-pointer items-center justify-center rounded-full outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 group-data-[state=open]/beacon:hidden motion-reduce:hidden" />
      <span className="relative inline-flex size-3 rounded-full border-2 border-background bg-primary shadow-sm" />
    </Hotspot.Beacon>
  );
}

function HotspotCard({
  className,
  sideOffset = 10,
  collisionPadding = 16,
  children,
  ...props
}: HotspotContentProps) {
  return (
    <Hotspot.Portal>
      <Hotspot.Content
        data-slot="hotspot-card"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'z-50 flex w-[min(18rem,calc(100vw-2rem))] origin-(--tour-content-transform-origin) flex-col gap-1.5 rounded-xl border bg-popover p-4 pr-10 text-sm text-popover-foreground shadow-lg outline-hidden',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        <Hotspot.Close asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Close hint"
            className="absolute top-2.5 right-2.5 text-muted-foreground"
          >
            <X />
          </Button>
        </Hotspot.Close>
      </Hotspot.Content>
    </Hotspot.Portal>
  );
}

function HotspotTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('leading-snug font-semibold', className)} {...props} />;
}

function HotspotDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('leading-relaxed text-muted-foreground', className)} {...props} />;
}

export interface HotspotHintProps extends Omit<HotspotRootProps, 'children'> {
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Accessible name of the hint dialog. Default: the title when it's a string. */
  label?: string;
  /** Accessible name of the beacon button. Default: "Show hint". */
  beaconLabel?: string;
  side?: HotspotContentProps['side'];
  align?: HotspotContentProps['align'];
}

/** Beacon + popover in one: `<HotspotHint target="#export" title="New">…</HotspotHint>`. */
function HotspotHint({
  title,
  children,
  label,
  beaconLabel,
  side,
  align,
  ...props
}: HotspotHintProps) {
  return (
    <Hotspot.Root {...props}>
      <HotspotBeacon label={beaconLabel} />
      <HotspotCard
        aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        side={side}
        align={align}
      >
        {title && <HotspotTitle>{title}</HotspotTitle>}
        {children && <HotspotDescription>{children}</HotspotDescription>}
      </HotspotCard>
    </Hotspot.Root>
  );
}

export { HotspotBeacon, HotspotCard, HotspotDescription, HotspotHint, HotspotTitle };
