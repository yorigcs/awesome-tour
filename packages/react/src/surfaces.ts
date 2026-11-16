/**
 * `@awesome-tour/react/surfaces` — announcements, surveys and the launcher. A separate entry so
 * apps that only run tours don't pay for them.
 */

export type { Announcement as AnnouncementInstance } from './surfaces/announcement';
export {
  Announcement,
  AnnouncementAction,
  type AnnouncementActionProps,
  AnnouncementDismiss,
  type AnnouncementOptions,
  AnnouncementRoot,
  type AnnouncementRootProps,
  AnnouncementSnooze,
  type AnnouncementSnoozeProps,
  type AnnouncementVariant,
  createAnnouncement,
} from './surfaces/announcement';
export {
  Launcher,
  LauncherBadge,
  type LauncherBadgeProps,
  LauncherContent,
  type LauncherContentProps,
  LauncherItem,
  type LauncherItemProps,
  type LauncherItemStatus,
  LauncherRoot,
  type LauncherRootProps,
  LauncherTrigger,
  useLauncherStatus,
} from './surfaces/launcher';
export {
  SurfaceContent,
  type SurfaceContentProps,
  type SurfaceVariant,
} from './surfaces/surface';
export type { Survey as SurveyInstance } from './surfaces/survey';
export {
  createSurvey,
  npsCategory,
  Survey,
  type SurveyAnswers,
  SurveyComment,
  type SurveyData,
  SurveyDismiss,
  type SurveyOptions,
  type SurveyQuestion,
  SurveyRoot,
  type SurveyRootProps,
  SurveyScale,
  type SurveyScaleProps,
  SurveyWhen,
  scaleOf,
} from './surfaces/survey';
