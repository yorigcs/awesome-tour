import { describe, expect, it, vi } from 'vitest';
import schema from '../schema/tour.schema.json';
import type { TourAnalyticsEvent } from '../src';
import { createTour } from '../src';
import {
  eventProperties,
  ga4Tracker,
  mixpanelTracker,
  posthogTracker,
  segmentTracker,
} from '../src/adapters';
import { fromJSON, type TourJSON, validateTourJSON } from '../src/json';

const doc: TourJSON = {
  id: 'onboarding',
  version: 2,
  rules: { audience: 'isPro', trigger: { route: '/billing/*' }, frequency: { maxShows: 2 } },
  steps: [
    { id: 'welcome', title: 'Welcome' },
    { id: 'admin', target: { anchor: 'admin' }, when: 'isAdmin', title: 'Admin' },
    {
      id: 'create',
      target: ['#create', { anchor: 'new' }],
      advanceOn: { event: 'click' },
      next: { action: 'pick' },
    },
    { id: 'done', title: 'Done' },
  ],
};

describe('fromJSON', () => {
  it('turns a document into tour options with actions wired in', async () => {
    const actions = {
      isAdmin: vi.fn(() => false),
      isPro: () => true,
      pick: () => 'done',
    };
    const tour = createTour(fromJSON(doc, { actions }));
    expect(tour.version).toBe(2);
    expect(tour.rules?.trigger?.route).toBe('/billing/*');
    await tour.start();
    await tour.next();
    expect(actions.isAdmin).toHaveBeenCalled();
    expect(tour.getState().stepId).toBe('create'); // `admin` skipped by its action
    expect(tour.getStep('create')!.target).toEqual(['#create', { __tourAnchor: 'new' }]);
  });

  it('reports every problem at once', () => {
    const problems = validateTourJSON(
      {
        id: '',
        steps: [
          { id: 'a', when: 'missing', next: 'nope' },
          { id: 'a', advanceOn: { to: 'zzz' } },
        ],
      },
      {},
    );
    expect(problems).toEqual([
      'tour.id must be a non-empty string',
      'steps[0].when: unknown action "missing"',
      'steps[1].id "a" is duplicated',
      'steps[0].next: unknown step "nope"',
      'steps[1].advanceOn.to: unknown step "zzz"',
    ]);
    expect(() => fromJSON({ id: 'x', steps: [] })).toThrow(/Invalid tour JSON/);
  });

  it('ships a JSON Schema that describes the document', () => {
    expect(schema.required).toEqual(['id', 'steps']);
    expect(Object.keys(schema.$defs.step.properties)).toEqual(
      expect.arrayContaining(['id', 'target', 'advanceOn', 'when', 'next']),
    );
  });
});

describe('analytics adapters', () => {
  const event: TourAnalyticsEvent = {
    type: 'step_viewed',
    tourId: 't',
    tourVersion: 1,
    stepId: 'a',
    stepIndex: 1,
    totalSteps: 3,
    timestamp: 1,
    meta: { label: 'x' },
  };

  it('forwards events to PostHog, Segment and Mixpanel', () => {
    const capture = vi.fn();
    const track = vi.fn();
    posthogTracker({ capture })(event);
    segmentTracker({ track })(event);
    mixpanelTracker({ track }, { name: (e) => `Tour ${e.type}` })(event);
    expect(capture).toHaveBeenCalledWith('step_viewed', eventProperties(event));
    expect(track).toHaveBeenCalledWith('step_viewed', expect.objectContaining({ stepId: 'a' }));
    expect(track).toHaveBeenLastCalledWith('Tour step_viewed', expect.any(Object));
  });

  it('flattens params for GA4', () => {
    const gtag = vi.fn();
    ga4Tracker(gtag)(event);
    const params = gtag.mock.calls[0]![2];
    expect(gtag.mock.calls[0]!.slice(0, 2)).toEqual(['event', 'step_viewed']);
    expect(params).toMatchObject({ tourId: 't', stepId: 'a' });
    expect(params).not.toHaveProperty('meta');
  });
});
