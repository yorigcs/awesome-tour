'use client';

import type { TourInstance } from '@awesome-tour/react';
import { Launcher, useLauncherStatus } from '@awesome-tour/react/surfaces';
import { ArrowUpRight, Check, CircleHelp, PlayCircle, RotateCcw } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface HelpLauncherTour {
  tour: TourInstance<any, any> | string;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export interface HelpLauncherLink {
  title: React.ReactNode;
  href: string;
}

export interface HelpLauncherProps {
  tours: readonly HelpLauncherTour[];
  links?: readonly HelpLauncherLink[];
  title?: React.ReactNode;
  /** Trigger label (screen readers and tooltip). Default: "Help". */
  label?: string;
  /** Screen-reader suffix of the badge count. Default: "1 tour to see" / "n tours to see". */
  unfinishedLabel?: (count: number) => string;
  /** Where the panel opens relative to the button. Default: `top` (for a corner button). */
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

function TourRow({ item }: { item: HelpLauncherTour }) {
  const status = useLauncherStatus(item.tour);
  const Icon = status === 'done' ? RotateCcw : PlayCircle;
  return (
    <li>
      <Launcher.Item
        tour={item.tour}
        className="group/row flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{item.title}</span>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </span>
        {status === 'done' ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3" aria-hidden="true" />
            Done
          </span>
        ) : status === 'new' ? (
          <span className="rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
            New
          </span>
        ) : null}
      </Launcher.Item>
    </li>
  );
}

/** A floating "?" button that opens a resource center: tours to (re)play and help links. */
function HelpLauncher({
  tours,
  links = [],
  title = 'Help center',
  label = 'Help',
  side = 'top',
  unfinishedLabel = (n) => (n === 1 ? '1 tour to see' : `${n} tours to see`),
  className,
}: HelpLauncherProps) {
  return (
    <Launcher.Root>
      <Launcher.Trigger
        className={cn(
          'fixed right-4 bottom-4 z-40 flex size-12 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:scale-95',
          className,
        )}
      >
        <CircleHelp className="size-6" aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <Launcher.Badge
          tours={tours.map((t) => t.tour)}
          className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-destructive text-[11px] font-semibold text-white"
        >
          {(count) => (
            <>
              {count}
              <span className="sr-only">, {unfinishedLabel(count)}</span>
            </>
          )}
        </Launcher.Badge>
      </Launcher.Trigger>
      <Launcher.Portal>
        <Launcher.Content
          side={side}
          aria-label={typeof title === 'string' ? title : label}
          className={cn(
            'z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-xl origin-(--tour-content-transform-origin)',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <p className="px-2 pt-1 font-semibold">{title}</p>
          <ul className="flex flex-col">
            {tours.map((item) => (
              <TourRow key={typeof item.tour === 'string' ? item.tour : item.tour.id} item={item} />
            ))}
          </ul>
          {links.length > 0 && (
            <ul className="flex flex-col border-t pt-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Launcher.Item asChild keepOpen>
                    <a
                      href={link.href}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {link.title}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  </Launcher.Item>
                </li>
              ))}
            </ul>
          )}
        </Launcher.Content>
      </Launcher.Portal>
    </Launcher.Root>
  );
}

export { HelpLauncher };
