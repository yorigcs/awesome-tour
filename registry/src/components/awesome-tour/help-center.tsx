'use client';

import { type ChecklistInstance, type Feed, type TourInstance, useFeed } from '@awesome-tour/react';
import { Launcher, useLauncherStatus } from '@awesome-tour/react/surfaces';
import { ArrowUpRight, Check, CircleHelp, PlayCircle, RotateCcw, Sparkles } from 'lucide-react';
import * as React from 'react';
import { ChecklistPanel } from '@/components/awesome-tour/checklist';
import { cn } from '@/lib/utils';

export interface HelpCenterTour {
  tour: TourInstance<any, any> | string;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export interface HelpCenterProps {
  /** "What's new": release notes with unread state (`createFeed`). */
  feed?: Feed;
  /** Tours to (re)play. */
  tours?: readonly HelpCenterTour[];
  /** An onboarding checklist shown at the top while it isn't done. */
  checklist?: ChecklistInstance;
  links?: readonly { title: React.ReactNode; href: string }[];
  title?: React.ReactNode;
  /** Trigger label. Default: "Help". */
  label?: string;
  /** Where the panel opens relative to the button. Default: `top` (for a corner button). */
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function TourRow({ item }: { item: HelpCenterTour }) {
  const status = useLauncherStatus(item.tour);
  const Icon = status === 'done' ? RotateCcw : PlayCircle;
  return (
    <li>
      <Launcher.Item
        tour={item.tour}
        className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{item.title}</span>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </span>
        {status === 'done' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3" aria-hidden="true" />
            Done
          </span>
        )}
      </Launcher.Item>
    </li>
  );
}

function FeedList({ feed }: { feed: Feed }) {
  const { items } = useFeed(feed);
  if (items.length === 0) return null;
  return (
    <section aria-label="What's new" className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5" aria-hidden="true" />
        What's new
      </p>
      <ul className="flex max-h-64 flex-col overflow-y-auto">
        {items.slice(0, 6).map((item) => {
          const body = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1.5 size-2 shrink-0 rounded-full',
                  item.read ? 'bg-transparent' : 'bg-primary',
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('font-medium', item.read && 'text-muted-foreground')}>
                    {item.title}
                  </span>
                  <time
                    dateTime={new Date(item.time).toISOString()}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  >
                    {dateFormat.format(item.time)}
                  </time>
                </span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </span>
              {!item.read && <span className="sr-only">(new)</span>}
            </>
          );
          const rowClass =
            'flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50';
          return (
            <li key={item.id}>
              {item.tour ? (
                <Launcher.Item
                  tour={item.tour}
                  className={cn(rowClass, 'cursor-pointer')}
                  onClick={() => feed.markRead(item.id)}
                >
                  {body}
                </Launcher.Item>
              ) : item.href ? (
                <Launcher.Item asChild keepOpen>
                  <a href={item.href} className={rowClass} onClick={() => feed.markRead(item.id)}>
                    {body}
                  </a>
                </Launcher.Item>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function UnreadBadge({ feed, tours }: { feed?: Feed; tours: readonly HelpCenterTour[] }) {
  const unread = feed ? <FeedUnread feed={feed} /> : null;
  return (
    <>
      {unread}
      <Launcher.Badge
        tours={tours.map((t) => t.tour)}
        className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-muted-foreground text-[10px] font-semibold text-background"
      >
        {(count) => (
          <>
            {count}
            <span className="sr-only">
              , {count === 1 ? '1 tour to see' : `${count} tours to see`}
            </span>
          </>
        )}
      </Launcher.Badge>
    </>
  );
}

function FeedUnread({ feed }: { feed: Feed }) {
  const { unread } = useFeed(feed);
  if (unread === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-destructive text-[11px] font-semibold text-white">
      {unread}
      <span className="sr-only">, {unread === 1 ? '1 new update' : `${unread} new updates`}</span>
    </span>
  );
}

/**
 * A resource center behind one button: what's new (with an unread badge), the onboarding
 * checklist, tours to replay, and help links. Opening it marks the news as read.
 */
function HelpCenter({
  feed,
  tours = [],
  checklist,
  links = [],
  title = 'Help center',
  label = 'Help',
  side = 'top',
  className,
}: HelpCenterProps) {
  const [open, setOpen] = React.useState(false);
  // Read when seen: mark everything read as the panel closes (the dots stay visible meanwhile).
  const close = (next: boolean) => {
    if (!next && open) feed?.markAllRead();
    setOpen(next);
  };
  return (
    <Launcher.Root open={open} onOpenChange={close}>
      <Launcher.Trigger
        className={cn(
          'fixed right-4 bottom-4 z-40 flex size-12 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:scale-95',
          className,
        )}
      >
        <CircleHelp className="size-6" aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <UnreadBadge feed={feed} tours={tours} />
      </Launcher.Trigger>
      <Launcher.Portal>
        <Launcher.Content
          side={side}
          aria-label={typeof title === 'string' ? title : label}
          className={cn(
            'z-50 flex max-h-[min(36rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-xl origin-(--tour-content-transform-origin)',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <p className="px-2 pt-1 font-semibold">{title}</p>
          {checklist && (
            <ChecklistPanel checklist={checklist} className="border-0 p-0 shadow-none" />
          )}
          {feed && <FeedList feed={feed} />}
          {tours.length > 0 && (
            <section aria-label="Tours" className="flex flex-col gap-1 border-t pt-2">
              <ul className="flex flex-col">
                {tours.map((item) => (
                  <TourRow
                    key={typeof item.tour === 'string' ? item.tour : item.tour.id}
                    item={item}
                  />
                ))}
              </ul>
            </section>
          )}
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

export { HelpCenter };
