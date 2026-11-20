import { isBrowser } from './dom';
import type { TourManager } from './manager';
import { createTour } from './tour';
import type { StepDefinition, Tour, TourOptions } from './types';

export interface PreviewOptions {
  /**
   * Load the draft named in the URL: return tour options (e.g. `fromJSON(await res.json())`),
   * or `null` when there's no such draft (or the user may not see it).
   */
  load: (
    id: string,
    info: { stepId: string | null },
  ) => Promise<TourOptions<StepDefinition<any, string>, any> | null>;
  /** Query parameter naming the draft. Default: `tour-preview`. */
  param?: string;
  /** Query parameter naming the step to open. Default: `step`. */
  stepParam?: string;
  /** Called when loading fails. Default: a console error. */
  onError?: (error: unknown) => void;
}

/**
 * Preview an unpublished tour on the real app: `?tour-preview=first-session` loads the draft
 * through `load`, registers it (replacing the published tour with that id while previewing) and
 * starts it. A preview saves no progress or impressions, sends no analytics and ignores display
 * rules, so authors can try it on production without touching anyone's data. Returns a cleanup
 * that unregisters the draft.
 */
export function previewFromUrl(manager: TourManager, options: PreviewOptions): () => void {
  if (!isBrowser) return () => {};
  const url = new URL(window.location.href);
  const id = url.searchParams.get(options.param ?? 'tour-preview');
  if (!id) return () => {};
  const stepId = url.searchParams.get(options.stepParam ?? 'step');
  let cancelled = false;
  let unregister: (() => void) | undefined;
  let draft: Tour<any, any> | undefined;
  let published: Tour<any, any> | undefined;
  options
    .load(id, { stepId })
    .then((loaded) => {
      if (cancelled || !loaded) return;
      draft = createTour({ ...loaded, id, preview: true });
      published = manager.get(id);
      published?.close();
      unregister = manager.register(draft);
      void manager.start(id, {
        force: true,
        interrupt: true,
        ...(stepId ? { stepId } : {}),
      });
    })
    .catch(options.onError ?? ((error) => console.error('[awesome-tour] preview failed', error)));
  return () => {
    cancelled = true;
    draft?.close();
    unregister?.();
    draft?.destroy();
    if (published) manager.register(published); // the live tour comes back
  };
}
