/** The headless tour instance type (`Tour` is the component namespace in this package). */
export type { Checklist as ChecklistInstance, Tour as TourInstance } from '@awesome-tour/core';
// Re-export the core so most apps only need one import.
export * from '@awesome-tour/core';
export {
  Checklist,
  ChecklistDismiss,
  ChecklistItem,
  ChecklistItemIndicator,
  type ChecklistItemIndicatorProps,
  type ChecklistItemProps,
  ChecklistItemSkip,
  ChecklistItemTrigger,
  type ChecklistItemTriggerProps,
  ChecklistList,
  ChecklistProgress,
  type ChecklistProgressProps,
  ChecklistRoot,
  type ChecklistRootProps,
  useChecklist,
  useChecklistItem,
} from './checklist';
export {
  defaultKeyMap,
  type LocalizedNode,
  type ReactStepDefinition,
  type StepRenderProps,
  TourContext,
  type TourContextValue,
  type TourKeyMap,
  TourProvider,
  type TourProviderProps,
  useTourContext,
  useTourManager,
  useTourProvider,
} from './context';
export { createTour } from './create-tour';
export {
  type ExternalStore,
  type UseTourResult,
  useFeed,
  useStoreSelector,
  useTargetRect,
  useTargetRects,
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
  type HotspotRecord,
  HotspotRoot,
  type HotspotRootProps,
  useResolvedTarget,
} from './hotspot';
export {
  defaultMessages,
  LocaleScope,
  MessagesScope,
  type TourMessages,
  type TourMessagesInput,
  useLocale,
  useLocalize,
  useTourMessages,
} from './messages';
export { type UseRouterAdapterOptions, useRouterAdapter } from './router';
export {
  type CutoutShape,
  getSpotlightPath,
  type IndicatorItem,
  keyAction,
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
export type { Align, PhysicalSide, PositionerOptions, Side } from './utils/positioner';
export { Presence, usePresence } from './utils/presence';
export { Primitive, type PrimitiveProps } from './utils/primitive';
export { Slot } from './utils/slot';
