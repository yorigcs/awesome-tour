/** The headless tour instance type (`Tour` is the component namespace in this package). */
export type { Tour as TourInstance } from '@awesome-tour/core';
// Re-export the core so most apps only need one import.
export * from '@awesome-tour/core';
export {
  type ReactStepDefinition,
  type StepRenderProps,
  TourContext,
  type TourContextValue,
  TourProvider,
  type TourProviderProps,
  useTourContext,
  useTourManager,
  useTourProvider,
} from './context';
export {
  type UseTourResult,
  useTargetRect,
  useTour,
  useTourAnchor,
  useTourEvent,
  useTourSelector,
  useTourState,
  useTourStep,
} from './hooks';
export {
  Hotspot,
  HotspotBeacon,
  type HotspotBeaconProps,
  HotspotClose,
  HotspotContent,
  type HotspotContentProps,
  HotspotRoot,
  type HotspotRootProps,
  useResolvedTarget,
} from './hotspot';
export {
  getSpotlightPath,
  type IndicatorItem,
  type Padding,
  Portal,
  type PortalProps,
  Tour,
  TourAnchor,
  type TourAnchorProps,
  TourArrow,
  type TourArrowProps,
  TourClose,
  TourContent,
  type TourContentProps,
  TourDescription,
  TourIndicators,
  type TourIndicatorsProps,
  TourNext,
  TourOverlay,
  type TourOverlayProps,
  TourPrev,
  TourProgress,
  type TourProgressProps,
  TourRoot,
  type TourRootProps,
  TourSkip,
  TourSpotlight,
  type TourSpotlightProps,
  TourStep,
  TourStepContent,
  type TourStepContentProps,
  type TourStepProps,
  TourTitle,
  TourTrigger,
  type TourTriggerProps,
  useTourContentContext,
  useTourLayer,
} from './tour';
export { composeEventHandlers, composeRefs, useComposedRefs } from './utils/compose';
export type { Align, PositionerOptions, Side } from './utils/positioner';
export { Presence, usePresence } from './utils/presence';
export { Primitive, type PrimitiveProps } from './utils/primitive';
export { Slot } from './utils/slot';
