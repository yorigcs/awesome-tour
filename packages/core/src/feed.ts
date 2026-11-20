import type { PersistenceAdapter } from './persistence';
import { createStore } from './store';
import type { DateInput, Listener } from './types';

/**
 * A "What's new" feed: release notes and tips with read/unread state, for a help center badge.
 * Headless like the checklist: it holds the state, you render it.
 */

export interface FeedItem {
  id: string;
  title: string;
  description?: string;
  /** Publication date: newer items come first, and decide what "read up to now" covers. */
  date: DateInput;
  /** A link to read more. */
  href?: string;
  /** A tour that shows the feature. */
  tour?: string;
  meta?: Record<string, unknown>;
}

export interface FeedSnapshot {
  /** Everything published up to this time counts as read. */
  readAt: number | null;
  /** Items read one by one since. */
  read: string[];
}

export interface FeedEntry extends FeedItem {
  read: boolean;
  /** `date` as a timestamp. */
  time: number;
}

export interface FeedState {
  /** Newest first. */
  items: FeedEntry[];
  unread: number;
  /** Saved state was loaded (always true without `persistence`). */
  hydrated: boolean;
}

export interface FeedOptions {
  id: string;
  items: readonly FeedItem[];
  /** Remember what was read (localStorage, your API). */
  persistence?: PersistenceAdapter<FeedSnapshot>;
}

export interface Feed {
  readonly id: string;
  getState(): FeedState;
  subscribe(listener: Listener): () => void;
  markRead(id: string): void;
  /** Everything published so far is read (the panel was opened). */
  markAllRead(): void;
  /** Replace the items (fetched from your CMS, say). */
  setItems(items: readonly FeedItem[]): void;
  /** Resolves once saved state is loaded. */
  ready(): Promise<void>;
}

const toTime = (d: DateInput) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

export function createFeed(options: FeedOptions): Feed {
  let items = [...options.items];
  let snapshot: FeedSnapshot = { readAt: null, read: [] };
  const { persistence } = options;

  const derive = (hydrated: boolean): FeedState => {
    const entries = items
      .map((item) => {
        const time = toTime(item.date);
        const read =
          snapshot.read.includes(item.id) || (snapshot.readAt != null && time <= snapshot.readAt);
        return { ...item, time, read };
      })
      .sort((a, b) => b.time - a.time);
    return { items: entries, unread: entries.filter((e) => !e.read).length, hydrated };
  };

  const store = createStore<FeedState>(derive(!persistence));

  const save = () => {
    store.setState(derive(store.getState().hydrated));
    if (!persistence) return;
    const warn = (error: unknown) => console.warn('[awesome-tour] feed: saving failed', error);
    try {
      const saving = persistence.set(options.id, snapshot);
      if (saving instanceof Promise) saving.catch(warn);
    } catch (error) {
      warn(error);
    }
  };

  const loading: Promise<void> = (async () => {
    if (!persistence) return;
    try {
      const saved = await persistence.get(options.id);
      if (saved && Array.isArray(saved.read))
        snapshot = { readAt: saved.readAt ?? null, read: saved.read };
    } catch (error) {
      console.warn('[awesome-tour] feed: loading failed', error);
    }
    store.setState(derive(true));
  })();

  return {
    id: options.id,
    getState: store.getState,
    subscribe: store.subscribe,
    markRead(id) {
      if (snapshot.read.includes(id)) return;
      snapshot = { ...snapshot, read: [...snapshot.read, id] };
      save();
    },
    markAllRead() {
      if (store.getState().unread === 0) return;
      const newest = Math.max(Date.now(), ...items.map((i) => toTime(i.date)));
      snapshot = { readAt: newest, read: [] };
      save();
    },
    setItems(next) {
      items = [...next];
      store.setState(derive(store.getState().hydrated));
    },
    ready: () => loading,
  };
}
