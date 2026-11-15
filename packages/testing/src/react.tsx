/**
 * React Testing Library helpers: render inside a `TourProvider`, get the manager back.
 */
import {
  type ImpressionRecord,
  type PersistenceAdapter,
  type RouterAdapter,
  type TourInstance,
  type TourManager,
  type TourMessagesInput,
  TourProvider,
  useTourManager,
} from '@awesome-tour/react';
import { type RenderOptions, type RenderResult, render } from '@testing-library/react';
import type * as React from 'react';

export interface RenderWithTourOptions extends Omit<RenderOptions, 'wrapper'> {
  tours?: TourInstance<any, any>[];
  router?: RouterAdapter;
  messages?: TourMessagesInput;
  impressions?: PersistenceAdapter<ImpressionRecord>;
}

export interface RenderWithTourResult extends RenderResult {
  /** The provider's tour manager (start, explain, signal…). */
  manager: TourManager;
}

function Capture({ into }: { into: { current: TourManager | null } }) {
  into.current = useTourManager();
  return null;
}

/** `render` wrapped in a `TourProvider`. */
export function renderWithTour(
  ui: React.ReactElement,
  { tours, router, messages, impressions, ...options }: RenderWithTourOptions = {},
): RenderWithTourResult {
  const ref: { current: TourManager | null } = { current: null };
  const result = render(
    <TourProvider
      {...(tours ? { tours } : {})}
      {...(router ? { router } : {})}
      {...(messages ? { messages } : {})}
      {...(impressions ? { impressions } : {})}
    >
      <Capture into={ref} />
      {ui}
    </TourProvider>,
    options,
  );
  return { ...result, manager: ref.current! };
}
