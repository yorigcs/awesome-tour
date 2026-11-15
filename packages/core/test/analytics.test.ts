import { describe, expect, it, vi } from 'vitest';
import { analytics, createTour, type TourAnalyticsEvent } from '../src';

describe('analytics plugin', () => {
  it('emits flat lifecycle events with timing', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const events: TourAnalyticsEvent[] = [];
    const tour = createTour({
      id: 'a',
      version: 3,
      data: { secret: 'x' },
      steps: [{ id: 's1', meta: { label: 'intro' } }, { id: 's2' }],
      plugins: [analytics((e) => events.push(e))],
    });
    await tour.start();
    vi.setSystemTime(Date.now() + 1500);
    await tour.next();
    tour.skip();

    expect(events.map((e) => e.type)).toEqual([
      'tour_started',
      'step_viewed',
      'step_viewed',
      'tour_skipped',
    ]);
    expect(events[1]).toMatchObject({
      tourId: 'a',
      tourVersion: 3,
      stepId: 's1',
      stepIndex: 1,
      totalSteps: 2,
      meta: { label: 'intro' },
    });
    expect(events[2]).toMatchObject({
      stepId: 's2',
      direction: 'forward',
      previousStepId: 's1',
      previousStepDurationMs: 1500,
    });
    expect(events[3]).toMatchObject({ stepId: 's2', durationMs: 1500, stepDurationMs: 0 });
    expect(events.every((e) => !('data' in e))).toBe(true);
    vi.useRealTimers();
  });

  it('supports includeData and filter', async () => {
    const events: TourAnalyticsEvent[] = [];
    const tour = createTour({
      id: 'b',
      data: { plan: 'pro' },
      steps: [{ id: 's1' }],
      plugins: [
        analytics((e) => events.push(e), {
          includeData: true,
          filter: (e) => e.type !== 'step_viewed',
        }),
      ],
    });
    await tour.start();
    await tour.next();
    expect(events.map((e) => e.type)).toEqual(['tour_started', 'tour_completed']);
    expect(events[0]!.data).toEqual({ plan: 'pro' });
  });
});
