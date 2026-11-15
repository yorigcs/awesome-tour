import {
  type RouterAdapter,
  type UseRouterAdapterOptions,
  useRouterAdapter,
} from '@awesome-tour/react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Router adapter for the Next.js App Router. Use it in a client component (e.g. your providers
 * file) and pass the result to `<TourProvider router={…}>`.
 */
export function useNextRouterAdapter(
  options: Pick<UseRouterAdapterOptions, 'match' | 'timeout'> & { scroll?: boolean } = {},
): RouterAdapter {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { scroll, ...rest } = options;
  return useRouterAdapter({
    pathname,
    navigate: (path) => router.push(path, scroll === undefined ? undefined : { scroll }),
    ...rest,
  });
}
