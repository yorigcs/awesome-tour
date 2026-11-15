import { createBrowserRouter } from '@awesome-tour/react';
import { useSyncExternalStore } from 'react';

/** Tiny History API router shared with the tours (multi-page steps). */
export const router = createBrowserRouter();

export function usePath() {
  return useSyncExternalStore(
    (l) => router.subscribe!(l),
    () => router.getPath(),
    () => '/',
  );
}

export function navigate(path: string) {
  void router.navigate(path);
}
