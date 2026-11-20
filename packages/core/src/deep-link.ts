import { isBrowser } from './dom';
import type { TourManager } from './manager';

export interface DeepLinkOptions {
  /** Query parameter naming the tour. Default: `tour`. */
  param?: string;
  /** Query parameter naming the step to start at. Default: `step`. */
  stepParam?: string;
  /** Remove the parameters from the URL once read (history.replaceState). Default: true. */
  clean?: boolean;
}

/**
 * Start a tour from a link: `https://app.example/?tour=first-session&step=mixer` opens that tour
 * (forced, at that step) once it's registered. Share it in a help article, an email or a support
 * reply. Returns a cleanup. Unknown tour ids are ignored.
 */
export function deepLink(manager: TourManager, options: DeepLinkOptions = {}): () => void {
  if (!isBrowser) return () => {};
  const { param = 'tour', stepParam = 'step', clean = true } = options;
  const url = new URL(window.location.href);
  const tourId = url.searchParams.get(param);
  if (!tourId) return () => {};
  const stepId = url.searchParams.get(stepParam) ?? undefined;
  let done = false;
  const tryStart = () => {
    if (done || !manager.get(tourId)) return;
    done = true;
    off();
    if (clean) {
      url.searchParams.delete(param);
      url.searchParams.delete(stepParam);
      window.history.replaceState(window.history.state, '', url.toString());
    }
    void manager.start(tourId, { force: true, ...(stepId ? { stepId } : {}), interrupt: true });
  };
  // The tour may register later (lazy routes): wait for it.
  const off = manager.subscribe(tryStart);
  queueMicrotask(tryStart);
  return () => {
    done = true;
    off();
  };
}
