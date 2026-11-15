import * as React from 'react';

/**
 * Every string the primitives render or announce on their own. Override any subset per
 * `TourProvider`, `Tour.Root`, `Hotspot.Root` or `Checklist.Root` (nearest wins, merged).
 * Props on individual parts (`aria-label`, `getLabel`, `labels`…) still take precedence.
 */
export interface TourMessages {
  /** Screen-reader announcement on each step, and the default `Tour.Progress` text. */
  stepOf: (current: number, total: number) => string;
  /** `Tour.Close` accessible name. */
  closeTour: string;
  /** `Tour.Indicators` group label. */
  tourSteps: string;
  /** Each `Tour.Indicators` button. */
  goToStep: (index: number) => string;
  /** `Hotspot.Beacon` accessible name. */
  showHint: string;
  /** `Hotspot.Close` accessible name. */
  closeHint: string;
  /** `Checklist.Progress` accessible name. */
  checklistProgress: string;
  /** `Checklist.Progress` value text. */
  checklistValue: (completed: number, total: number) => string;
  /** `Checklist.ItemIndicator` screen-reader status, per item status. */
  itemStatus: { pending: string; done: string; skipped: string };
  /** `Checklist.Dismiss` accessible name. */
  dismissChecklist: string;
}

/** What `messages` props accept: any subset, including part of `itemStatus`. */
export type TourMessagesInput = Partial<Omit<TourMessages, 'itemStatus'>> & {
  itemStatus?: Partial<TourMessages['itemStatus']>;
};

export const defaultMessages: TourMessages = {
  stepOf: (current, total) => `Step ${current} of ${total}`,
  closeTour: 'Close tour',
  tourSteps: 'Tour steps',
  goToStep: (index) => `Go to step ${index}`,
  showHint: 'Show hint',
  closeHint: 'Close hint',
  checklistProgress: 'Checklist progress',
  checklistValue: (completed, total) => `${completed} of ${total} completed`,
  itemStatus: { pending: 'Not completed', done: 'Completed', skipped: 'Skipped' },
  dismissChecklist: 'Dismiss checklist',
};

const MessagesContext = React.createContext<TourMessages>(defaultMessages);

/** The messages in effect at this point of the tree. */
export function useTourMessages(): TourMessages {
  return React.useContext(MessagesContext);
}

/** Merges `messages` over the inherited ones for its subtree. */
export function MessagesScope({
  messages,
  children,
}: {
  messages: TourMessagesInput | undefined;
  children?: React.ReactNode;
}) {
  const parent = React.useContext(MessagesContext);
  const value = React.useMemo(
    () =>
      messages
        ? {
            ...parent,
            ...messages,
            itemStatus: { ...parent.itemStatus, ...messages.itemStatus },
          }
        : parent,
    [parent, messages],
  );
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}
