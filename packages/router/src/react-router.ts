import {
  type RouterAdapter,
  type UseRouterAdapterOptions,
  useRouterAdapter,
} from '@awesome-tour/react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Router adapter for React Router (v6.4+ / v7+). Call it inside your router and pass the result to
 * `<TourProvider router={…}>`.
 */
export function useReactRouterAdapter(
  options: Pick<UseRouterAdapterOptions, 'match' | 'timeout'> = {},
): RouterAdapter {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return useRouterAdapter({ pathname, navigate: (path) => navigate(path), ...options });
}
