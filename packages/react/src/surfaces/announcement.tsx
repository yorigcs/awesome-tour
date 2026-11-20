import { createTour, type Tour as TourInstance, type TourOptions } from '@awesome-tour/core';
import * as React from 'react';
import type { LocalizedNode, ReactStepDefinition } from '../context';
import { useTourContext } from '../context';
import { useTourMessages } from '../messages';
import { Portal, Tour, type TourRootProps } from '../tour';
import { composeEventHandlers } from '../utils/compose';
import { Primitive, type PrimitiveProps } from '../utils/primitive';
import { SurfaceContent, type SurfaceVariant } from './surface';

export type AnnouncementVariant = SurfaceVariant;

export interface AnnouncementOptions<TData = Record<string, unknown>>
  extends Omit<TourOptions<ReactStepDefinition<TData>, TData>, 'steps' | 'layer'> {
  /** Default: `banner`. `modal` is blocking (queues with tours); the others are ambient. */
  variant?: AnnouncementVariant;
  title?: LocalizedNode;
  description?: LocalizedNode;
  content?: ReactStepDefinition<TData>['content'];
  /** Close by itself after this many ms (toasts). Counts as completed. */
  autoDismiss?: number;
  meta?: Record<string, unknown>;
}

export type Announcement<TData = Record<string, unknown>> = TourInstance<
  ReactStepDefinition<TData>,
  TData
> & { readonly variant: AnnouncementVariant };

/**
 * An announcement is a one-step tour with a presentation: so it gets display rules, triggers,
 * snooze, impressions, persistence and analytics for free. Register it on `TourProvider` like a
 * tour.
 */
export function createAnnouncement<TData = Record<string, unknown>>(
  options: AnnouncementOptions<TData>,
): Announcement<TData> {
  const { variant = 'banner', title, description, content, autoDismiss, meta, ...rest } = options;
  const tour = createTour<ReactStepDefinition<TData>, TData>({
    modal: variant === 'modal',
    ...rest,
    layer: variant === 'modal' ? 'blocking' : 'ambient',
    steps: [
      {
        id: 'announcement',
        title,
        description,
        content,
        meta: { ...meta, variant },
        ...(autoDismiss != null ? { advanceOn: { delay: autoDismiss } } : {}),
      },
    ],
  });
  return Object.assign(tour, { variant });
}

/* -----------------------------------------------------------------------------------------------*/

export interface AnnouncementRootProps
  extends Omit<TourRootProps, 'tour' | 'tourId' | 'id' | 'steps' | 'plugins' | 'data'> {
  announcement: Announcement<any>;
}

/** Connects an announcement to the parts below (and to the `TourProvider`, if any). */
function AnnouncementRoot({ announcement, announce = false, ...props }: AnnouncementRootProps) {
  return <Tour.Root tour={announcement} announce={announce} {...props} />;
}

export interface AnnouncementActionProps extends PrimitiveProps<'button'> {
  /** What the action does to the announcement. Default: `complete` (it won't show again with `once`). */
  outcome?: 'complete' | 'close' | 'none';
}

/** The call to action. Use `asChild` to render a link. */
const AnnouncementAction = React.forwardRef<HTMLButtonElement, AnnouncementActionProps>(
  function AnnouncementAction({ outcome = 'complete', onClick, ...props }, ref) {
    const { tour } = useTourContext('<Announcement.Action>');
    return (
      <Primitive.button
        type="button"
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => {
          if (outcome === 'complete') tour.complete();
          else if (outcome === 'close') tour.close();
        })}
      />
    );
  },
);

/** Dismisses the announcement (counts as dismissed for `once`). */
const AnnouncementDismiss = React.forwardRef<HTMLButtonElement, PrimitiveProps<'button'>>(
  function AnnouncementDismiss({ onClick, ...props }, ref) {
    const { tour } = useTourContext('<Announcement.Dismiss>');
    const { dismiss } = useTourMessages();
    return (
      <Primitive.button
        type="button"
        aria-label={props.children ? undefined : dismiss}
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => tour.close())}
      />
    );
  },
);

export interface AnnouncementSnoozeProps extends PrimitiveProps<'button'> {
  /** For how long (ms). Default: one day. */
  duration?: number;
}

/** "Remind me later": closes it and keeps display rules from showing it again for `duration`. */
const AnnouncementSnooze = React.forwardRef<HTMLButtonElement, AnnouncementSnoozeProps>(
  function AnnouncementSnooze({ duration = 24 * 60 * 60 * 1000, onClick, ...props }, ref) {
    const { tour } = useTourContext('<Announcement.Snooze>');
    return (
      <Primitive.button
        type="button"
        {...props}
        ref={ref}
        onClick={composeEventHandlers(onClick, () => tour.snooze(duration))}
      />
    );
  },
);

export const Announcement = {
  Root: AnnouncementRoot,
  Portal,
  Content: SurfaceContent,
  Title: Tour.Title,
  Description: Tour.Description,
  Body: Tour.StepContent,
  Action: AnnouncementAction,
  Dismiss: AnnouncementDismiss,
  Snooze: AnnouncementSnooze,
};

export { AnnouncementAction, AnnouncementDismiss, AnnouncementRoot, AnnouncementSnooze };
