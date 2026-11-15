import { matchRoute, type RouterAdapter } from '@awesome-tour/core';
import * as React from 'react';
import { useIsomorphicLayoutEffect } from './utils/hooks';

export interface UseRouterAdapterOptions {
  /** Current pathname from your router. */
  pathname: string;
  /** Your router's navigate/push function. */
  navigate: (path: string) => unknown;
  /** Route matcher. Default: `matchRoute` (`/projects/:id`, `/docs/*`). */
  match?: (route: string, path: string) => boolean;
  /** Max time `navigate` waits for the pathname to change (ms). Default: 3000. */
  timeout?: number;
}

/**
 * Bridge any router to awesome-tour. Pass the result to `<TourProvider router={…}>`.
 * `navigate` resolves once the router has committed the new pathname.
 *
 * @example
 * const router = useRouterAdapter({ pathname: useLocation().pathname, navigate: useNavigate() });
 */
export function useRouterAdapter(options: UseRouterAdapterOptions): RouterAdapter {
  const latest = React.useRef(options);
  const committedPath = React.useRef(options.pathname);
  const listeners = React.useRef(new Set<() => void>());
  latest.current = options;

  useIsomorphicLayoutEffect(() => {
    if (committedPath.current === options.pathname) return;
    committedPath.current = options.pathname;
    for (const listener of [...listeners.current]) listener();
  }, [options.pathname]);

  return React.useMemo<RouterAdapter>(
    () => ({
      getPath: () => committedPath.current,
      match: (route, path) => (latest.current.match ?? matchRoute)(route, path),
      subscribe(listener) {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      navigate(path) {
        const target = path.split(/[?#]/)[0] || '/';
        latest.current.navigate(path);
        if (committedPath.current === target) return;
        return new Promise<void>((resolve) => {
          const done = () => {
            listeners.current.delete(check);
            clearTimeout(timer);
            resolve();
          };
          const check = () => {
            if (committedPath.current === target) done();
          };
          const timer = setTimeout(done, latest.current.timeout ?? 3000);
          listeners.current.add(check);
        });
      },
    }),
    [],
  );
}
