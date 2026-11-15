/**
 * `@awesome-tour/core/adapters` — tiny bridges from the `analytics()` plugin to common tools.
 * Each returns a `track` function: `analytics(posthogTracker(posthog))`.
 * Clients are typed structurally, so no SDK is imported here.
 */
import type { TourAnalyticsEvent } from './analytics';

/** Flat, tool-friendly properties (no nested objects except `meta`/`data` when present). */
export function eventProperties(event: TourAnalyticsEvent): Record<string, unknown> {
  const { type: _type, ...props } = event;
  return props;
}

export interface TrackerOptions {
  /** Event name for a tour event. Default: the event type (`tour_started`, `step_viewed`…). */
  name?: (event: TourAnalyticsEvent) => string;
  /** Extra / rewritten properties. */
  properties?: (event: TourAnalyticsEvent) => Record<string, unknown>;
}

const nameOf = (o: TrackerOptions, e: TourAnalyticsEvent) => o.name?.(e) ?? e.type;
const propsOf = (o: TrackerOptions, e: TourAnalyticsEvent) =>
  o.properties?.(e) ?? eventProperties(e);

/** PostHog: `posthog.capture(name, properties)`. */
export function posthogTracker(
  client: { capture(event: string, properties?: Record<string, unknown>): unknown },
  options: TrackerOptions = {},
) {
  return (e: TourAnalyticsEvent) => void client.capture(nameOf(options, e), propsOf(options, e));
}

/** Segment (analytics.js / analytics-next): `analytics.track(name, properties)`. */
export function segmentTracker(
  client: { track(event: string, properties?: Record<string, unknown>): unknown },
  options: TrackerOptions = {},
) {
  return (e: TourAnalyticsEvent) => void client.track(nameOf(options, e), propsOf(options, e));
}

/** Mixpanel: `mixpanel.track(name, properties)`. */
export function mixpanelTracker(
  client: { track(event: string, properties?: Record<string, unknown>): unknown },
  options: TrackerOptions = {},
) {
  return (e: TourAnalyticsEvent) => void client.track(nameOf(options, e), propsOf(options, e));
}

/**
 * Google Analytics 4 through `gtag('event', name, params)`. GA4 params must be flat primitives,
 * so `meta` and `data` are dropped unless you map them with `properties`.
 */
export function ga4Tracker(
  gtag: (command: 'event', name: string, params?: Record<string, unknown>) => void,
  options: TrackerOptions = {},
) {
  return (e: TourAnalyticsEvent) => {
    const params = options.properties?.(e) ?? flat(eventProperties(e));
    gtag('event', nameOf(options, e), params);
  };
}

function flat(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
  }
  return out;
}
