'use client';

import { Tour, useTourMessages } from '@awesome-tour/react';
import { Announcement, type AnnouncementInstance } from '@awesome-tour/react/surfaces';
import { Megaphone, X } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnnouncementUIProps {
  announcement: AnnouncementInstance<any>;
  /** The call to action's label. Omit for no action button. */
  actionLabel?: React.ReactNode;
  /** Called when the action is clicked (the announcement completes afterwards). */
  onAction?: () => void;
  /** Show a "Remind me later" button that snoozes for this many ms. */
  snooze?: number;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

function Actions({
  actionLabel,
  onAction,
  snooze,
  size = 'sm',
}: Pick<AnnouncementUIProps, 'actionLabel' | 'onAction' | 'snooze'> & { size?: 'sm' | 'default' }) {
  return (
    <>
      {snooze != null && (
        <Announcement.Snooze asChild duration={snooze}>
          <Button variant="ghost" size={size}>
            Remind me later
          </Button>
        </Announcement.Snooze>
      )}
      {actionLabel && (
        <Announcement.Action asChild>
          <Button size={size} onClick={onAction}>
            {actionLabel}
          </Button>
        </Announcement.Action>
      )}
    </>
  );
}

function Dismiss({ className }: { className?: string }) {
  const { dismiss } = useTourMessages();
  return (
    <Announcement.Dismiss asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={dismiss}
        className={cn('shrink-0 text-muted-foreground', className)}
      >
        <X />
      </Button>
    </Announcement.Dismiss>
  );
}

/** An inline strip — put it at the top of the page or a section. Ambient: never blocks. */
function AnnouncementBanner({
  announcement,
  icon = <Megaphone />,
  className,
  children,
  ...actions
}: AnnouncementUIProps) {
  return (
    <Announcement.Root announcement={announcement}>
      <Announcement.Content
        data-slot="announcement-banner"
        className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-xs',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground [&_svg]:size-4"
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Announcement.Title className="font-semibold leading-snug" />
          <Announcement.Description className="text-muted-foreground" />
          {children}
        </div>
        <div className="flex items-center gap-1">
          <Actions {...actions} />
          <Dismiss />
        </div>
      </Announcement.Content>
    </Announcement.Root>
  );
}

/** A corner notification. Ambient and polite (`role="status"`); pair with `autoDismiss`. */
function AnnouncementToast({
  announcement,
  icon = <Megaphone />,
  className,
  children,
  ...actions
}: AnnouncementUIProps) {
  return (
    <Announcement.Root announcement={announcement}>
      <Announcement.Portal>
        <Announcement.Content
          data-slot="announcement-toast"
          className={cn(
            'fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] gap-3 rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-4',
            className,
          )}
        >
          <span aria-hidden="true" className="mt-0.5 text-primary [&_svg]:size-4">
            {icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Announcement.Title className="font-semibold leading-snug" />
            <Announcement.Description className="text-muted-foreground" />
            {children}
            {(actions.actionLabel || actions.snooze != null) && (
              <div className="mt-2 flex gap-1">
                <Actions {...actions} />
              </div>
            )}
          </div>
          <Dismiss className="-mt-1 -mr-1" />
        </Announcement.Content>
      </Announcement.Portal>
    </Announcement.Root>
  );
}

/** A centered dialog with an optional image. Blocking: it waits for tours ahead of it. */
function AnnouncementModal({
  announcement,
  media,
  className,
  children,
  ...actions
}: AnnouncementUIProps & { media?: React.ReactNode }) {
  return (
    <Announcement.Root announcement={announcement}>
      <Announcement.Portal>
        <Tour.Overlay className="z-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Announcement.Content
          data-slot="announcement-modal"
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-popover text-sm text-popover-foreground shadow-2xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
        >
          {media && (
            <div className="border-b bg-muted [&_img]:w-full [&_video]:w-full">{media}</div>
          )}
          <div className="flex flex-col gap-2 p-6">
            <div className="flex items-start gap-2">
              <Announcement.Title className="flex-1 text-lg leading-snug font-semibold" />
              <Dismiss className="-mt-1 -mr-2" />
            </div>
            <Announcement.Description className="leading-relaxed text-muted-foreground" />
            {children}
            <div className="mt-3 flex justify-end gap-2">
              <Actions size="default" {...actions} />
            </div>
          </div>
        </Announcement.Content>
      </Announcement.Portal>
    </Announcement.Root>
  );
}

export { AnnouncementBanner, AnnouncementModal, AnnouncementToast };
