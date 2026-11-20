import { getExperiment } from './experiments';
import type { Tour, TourDirection, TourPlugin } from './types';

export type TourAnalyticsEventType =
  | 'tour_started'
  | 'step_viewed'
  | 'tour_completed'
  | 'tour_skipped'
  | 'tour_dismissed'
  | 'tour_paused'
  | 'tour_resumed'
  | 'target_missing'
  | 'tour_goal_reached'
  | 'tour_error';

export interface TourAnalyticsEvent {
  type: TourAnalyticsEventType;
  tourId: string;
  tourVersion: number;
  stepId: string | null;
  /** 1-based position among visible steps (0 when unknown). */
  stepIndex: number;
  totalSteps: number;
  timestamp: number;
  /** step_viewed: how the user got here. */
  direction?: TourDirection;
  /** step_viewed: the step that was left and how long it was on screen. */
  previousStepId?: string | null;
  previousStepDurationMs?: number;
  /** Lifecycle end events: time since start, and time on the last step. */
  durationMs?: number;
  stepDurationMs?: number;
  /** Step `meta`, handy for analytics labels. */
  meta?: Record<string, unknown>;
  /** Tour data (only when `includeData` is set). */
  data?: unknown;
  error?: string;
  /** tour_goal_reached: the goal's name and how the run stood when it was reached. */
  goal?: string;
  outcome?: string;
  /** Set when the tour is a variant of an experiment (`createExperiment`). */
  experimentId?: string;
  variant?: string;
}

export interface AnalyticsOptions {
  /** Attach `tour.getState().data` to every event. Default: false (may contain PII). */
  includeData?: boolean;
  /** Drop events you don't care about. */
  filter?: (event: TourAnalyticsEvent) => boolean;
  /** Also report tours in preview (drafts). Default: false — previews don't skew your data. */
  includePreviews?: boolean;
}

/**
 * Plugin that turns tour activity into flat analytics events — map them to Segment, PostHog,
 * Amplitude, GA… in `track`.
 *
 * @example
 * plugins: [analytics((e) => posthog.capture(e.type, e))]
 */
export function analytics(
  track: (event: TourAnalyticsEvent) => void,
  options: AnalyticsOptions = {},
): TourPlugin {
  return {
    name: 'analytics',
    setup(tour: Tour) {
      if (tour.preview && !options.includePreviews) return;
      let startedAt = 0;
      let stepStartedAt = 0;
      const now = () => Date.now();

      const emit = (type: TourAnalyticsEventType, extra: Partial<TourAnalyticsEvent> = {}) => {
        const state = tour.getState();
        const step = tour.getCurrentStep();
        const event: TourAnalyticsEvent = {
          type,
          tourId: tour.id,
          tourVersion: tour.version,
          stepId: state.stepId,
          stepIndex: state.progress.current,
          totalSteps: state.progress.total,
          timestamp: now(),
          ...(step?.meta ? { meta: step.meta } : {}),
          ...(options.includeData ? { data: state.data } : {}),
          ...getExperiment(tour),
          ...extra,
        };
        if (options.filter && !options.filter(event)) return;
        try {
          track(event);
        } catch (error) {
          console.error('[awesome-tour] analytics `track` threw', error);
        }
      };

      const ending = () => ({
        durationMs: startedAt ? now() - startedAt : 0,
        stepDurationMs: stepStartedAt ? now() - stepStartedAt : 0,
      });

      const offs = [
        tour.on('start', () => {
          startedAt = now();
          emit('tour_started');
        }),
        tour.on('stepChange', ({ from, direction }) => {
          const previousStepDurationMs = from && stepStartedAt ? now() - stepStartedAt : undefined;
          stepStartedAt = now();
          emit('step_viewed', {
            direction,
            previousStepId: from,
            ...(previousStepDurationMs !== undefined ? { previousStepDurationMs } : {}),
          });
        }),
        tour.on('complete', () => emit('tour_completed', ending())),
        tour.on('skip', () => emit('tour_skipped', ending())),
        tour.on('close', () => emit('tour_dismissed', ending())),
        tour.on('pause', () => emit('tour_paused', ending())),
        tour.on('resume', () => emit('tour_resumed')),
        tour.on('targetMissing', ({ stepId }) => emit('target_missing', { stepId })),
        tour.on('goal', ({ name, status, afterMs }) =>
          emit('tour_goal_reached', { goal: name, outcome: status, durationMs: afterMs }),
        ),
        tour.on('error', ({ error }) =>
          emit('tour_error', { error: error instanceof Error ? error.message : String(error) }),
        ),
      ];
      return () => {
        for (const off of offs) off();
      };
    },
  };
}
