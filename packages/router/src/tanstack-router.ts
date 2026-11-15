import {
  type RouterAdapter,
  type UseRouterAdapterOptions,
  useRouterAdapter,
} from '@awesome-tour/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';

/** Router adapter for TanStack Router. Pass the result to `<TourProvider router={…}>`. */
export function useTanStackRouterAdapter(
  options: Pick<UseRouterAdapterOptions, 'match' | 'timeout'> = {},
): RouterAdapter {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  return useRouterAdapter({
    pathname,
    navigate: (path) => navigate({ to: path } as Parameters<typeof navigate>[0]),
    ...options,
  });
}
