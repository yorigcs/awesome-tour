import {
  createTour as createCoreTour,
  type Tour as TourInstance,
  type TourOptions,
} from '@awesome-tour/core';
import type { ReactStepDefinition } from './context';

/**
 * `createTour` from the core, typed for React steps: `title`, `description`, `content`, `side`,
 * `align` and `interactive` are known step fields, even when inference falls back to the
 * constraint (e.g. a tour with typed `data` and `when`/`next` callbacks).
 */
export function createTour<
  const TStep extends ReactStepDefinition<TData, string>,
  TData = Record<string, unknown>,
>(options: TourOptions<TStep, TData>): TourInstance<TStep, TData> {
  return createCoreTour(options);
}
