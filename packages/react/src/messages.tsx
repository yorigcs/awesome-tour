import { type Localized, localize } from '@awesome-tour/core';
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
  /** `Checklist.ItemIndicator` status of a pending item waiting on its `after` items. */
  itemLocked: string;
  /** `Checklist.ItemIndicator` status suffix of an `optional` item. */
  itemOptional: string;
  /** `Checklist.Dismiss` accessible name. */
  dismissChecklist: string;
  /** `Announcement.Dismiss` / `Survey.Dismiss` accessible name. */
  dismiss: string;
  /** Accessible names of the ends of a survey scale. */
  scaleLow: string;
  scaleHigh: string;
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
  itemLocked: 'Locked: finish the previous steps first',
  itemOptional: 'optional',
  dismissChecklist: 'Dismiss checklist',
  dismiss: 'Dismiss',
  scaleLow: 'Not at all likely',
  scaleHigh: 'Extremely likely',
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

/* -------------------------------------------------------------------------------------------------
 * Locale: which language step content (`title: { en, pt }`) is shown in.
 * -----------------------------------------------------------------------------------------------*/

interface LocaleValue {
  locale: string | null;
  fallback: string;
}

const LocaleContext = React.createContext<LocaleValue | null>(null);

const subscribeLang = (onChange: () => void) => {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return () => mo.disconnect();
};
const documentLang = () => document.documentElement.lang || null;

/** The locale in effect: the nearest `locale` prop, else `<html lang>` (read after hydration). */
export function useLocale(): LocaleValue {
  const scoped = React.useContext(LocaleContext);
  const lang = React.useSyncExternalStore(subscribeLang, documentLang, () => null);
  return scoped?.locale ? scoped : { locale: lang, fallback: scoped?.fallback ?? 'en' };
}

/** `(value) => text`: resolves locale maps (`{ en, pt }`) for the locale in effect. */
export function useLocalize() {
  const { locale, fallback } = useLocale();
  return React.useCallback(
    <T,>(value: T | Localized<T> | undefined) => localize(value, locale, fallback),
    [locale, fallback],
  );
}

/** Sets the content locale for its subtree. */
export function LocaleScope({
  locale,
  fallbackLocale,
  children,
}: {
  locale: string | undefined;
  fallbackLocale?: string | undefined;
  children?: React.ReactNode;
}) {
  const parent = React.useContext(LocaleContext);
  const value = React.useMemo<LocaleValue | null>(
    () =>
      locale || fallbackLocale
        ? {
            locale: locale ?? parent?.locale ?? null,
            fallback: fallbackLocale ?? parent?.fallback ?? 'en',
          }
        : parent,
    [locale, fallbackLocale, parent],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
