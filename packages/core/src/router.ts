import { isBrowser } from './dom';
import type { RouterAdapter } from './types';

/**
 * Router adapter for apps using the History API. `navigate` pushes a new entry and dispatches
 * `popstate` so client routers that listen to it (React Router, etc.) pick up the change.
 * For framework routers, prefer writing a tiny adapter around their navigate function.
 */
export function createBrowserRouter(
  options: {
    /** Path prefix the app is served under, e.g. `/app`. */
    base?: string;
    /** Route matcher. Default: `matchRoute` (`/projects/:id`, `/docs/*`). */
    match?: (route: string, path: string) => boolean;
  } = {},
): RouterAdapter {
  const base = (options.base ?? '').replace(/\/$/, '');
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };
  return {
    ...(options.match ? { match: options.match } : {}),
    getPath: () => {
      if (!isBrowser) return '/';
      const { pathname } = window.location;
      const path = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
      return path || '/';
    },
    navigate(path) {
      if (!isBrowser) return;
      window.history.pushState(null, '', base + path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    subscribe(listener) {
      if (!isBrowser) return () => {};
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener('popstate', notify);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener('popstate', notify);
      };
    },
  };
}

const segments = (value: string) =>
  value
    .replace(/[?#].*$/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });

/**
 * Route matcher supporting `:params` and a trailing `*` wildcard. Query strings, hashes, repeated
 * and trailing slashes are ignored; segments are compared URL-decoded.
 */
export function matchRoute(route: string, path: string): boolean {
  const r = segments(route);
  const p = segments(path);
  for (let i = 0; i < r.length; i++) {
    const segment = r[i]!;
    if (segment === '*') return true;
    if (p[i] === undefined) return false;
    if (!segment.startsWith(':') && segment !== p[i]) return false;
  }
  return r.length === p.length;
}
