import {
  analytics,
  anchor,
  type ChecklistSnapshot,
  createChecklist,
  createStore,
  createTour,
  type ImpressionRecord,
  localStorageAdapter,
  persist,
  type ReactStepDefinition,
  type TourAnalyticsEvent,
} from '@awesome-tour/react';
import { createAnnouncement, createSurvey } from '@awesome-tour/react/surfaces';
import { router } from './router';
import { hasWebGL2 } from './webgl';

/** Last analytics events, shown in the playground (would go to Segment/PostHog in an app). */
export const eventLog = createStore<{ events: TourAnalyticsEvent[] }>({ events: [] });
const track = (event: TourAnalyticsEvent) => {
  eventLog.setState((s) => ({ events: [event, ...s.events].slice(0, 6) }));
};

export interface OnboardingData {
  plan: 'pro' | 'free';
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Loopwork',
    description: 'A one-minute tour of the studio. Use ← → or the buttons to move around.',
  },
  {
    id: 'sidebar',
    target: anchor('nav'),
    side: 'right',
    title: 'Your studio',
    description:
      'Arrange, Library, Mix and Studio. Targets are registered with anchors, not selectors.',
  },
  {
    id: 'search',
    target: '#search',
    interactive: true,
    title: 'Find a sound',
    description: 'Type at least 3 characters — the tour continues by itself.',
    advanceOn: {
      when: () =>
        ((document.querySelector('#search') as HTMLInputElement | null)?.value.length ?? 0) >= 3,
    },
  },
  {
    id: 'create',
    target: anchor('create'),
    title: 'Start a pattern',
    description: 'Click the button to continue.',
    advanceOn: { event: 'click' },
  },
  {
    id: 'mastering',
    target: '#mastering-panel',
    when: (ctx) => ctx.data.plan === 'pro',
    title: 'Mastering (Pro)',
    description: 'Only Pro plans see this step — steps can be conditional.',
  },
  {
    id: 'library',
    route: '/library',
    target: '#project-list',
    side: 'left',
    title: 'Your projects',
    description:
      'Tours can span pages: the router adapter navigates here before resolving the target.',
  },
  {
    id: 'late',
    route: '/library',
    target: '#loudness-widget',
    onTargetMissing: 'wait',
    title: 'Loudness, measured',
    description: 'This panel loads asynchronously. The tour waited for it to appear.',
  },
  {
    id: 'scroll',
    route: '/library',
    target: '#deep-item',
    title: 'Inside a scroll box',
    description: 'Targets inside nested scroll containers are scrolled into view.',
  },
  {
    id: 'model',
    route: '/studio',
    // Without WebGL the scene can't render, so the step is skipped instead of waiting on it.
    when: () => hasWebGL2(),
    target: anchor('lw16'),
    title: 'The LW-16, in 3D',
    description:
      'With @awesome-tour/three, objects inside a react-three-fiber scene are targets too.',
  },
  {
    id: 'lanes',
    route: '/',
    target: ['[data-tour="lane-drums"]', '[data-tour="lane-keys"]'],
    title: 'Drums and keys',
    description: 'A step can highlight several elements at once.',
  },
  {
    id: 'done',
    title: "You're all set",
    description: 'That was awesome-tour. Unstyled, accessible, composable.',
  },
] satisfies ReactStepDefinition<OnboardingData>[];

export const onboarding = createTour({
  id: 'onboarding',
  version: 1,
  data: { plan: 'pro' } as OnboardingData,
  steps,
  router,
  plugins: [persist(localStorageAdapter()), analytics(track)],
});

export const gettingStarted = createChecklist({
  id: 'getting-started',
  persistence: localStorageAdapter<ChecklistSnapshot>({ prefix: 'awesome-checklist:' }),
  items: [
    { id: 'onboarding', tour: 'onboarding', meta: { title: 'Take the studio tour' } },
    { id: 'css-tour', tour: 'css-tour', meta: { title: 'Try the CSS-only tour' } },
    { id: 'search', signal: 'searched', meta: { title: 'Search for a sound' } },
    { id: 'pattern', signal: 'pattern-created', meta: { title: 'Start a pattern' } },
  ],
});

/**
 * A one-step announcement with display rules: it starts by itself on /library (when no other
 * tour is on screen), at most once, and "Remind me later" snoozes it. See devtools → Rules.
 */
export const whatsNew = createTour({
  id: 'whats-new',
  modal: false,
  steps: [
    {
      id: 'table',
      target: '#project-list',
      side: 'bottom',
      title: 'New: project folders',
      description: 'Group sketches by album or client. Drag a project onto a folder.',
    },
  ],
  rules: {
    trigger: { route: '/library' },
    frequency: { once: true, maxShows: 3 },
  },
});

export const impressions = localStorageAdapter<ImpressionRecord>({
  prefix: 'awesome-impressions:',
});

/** An ambient banner: shows on Arrange until dismissed or acted on. */
export const stemsBanner = createAnnouncement({
  id: 'stems-banner',
  title: 'Stems export is here',
  description: 'Bounce one file per channel from the Mix page.',
  rules: { trigger: { route: '/' } },
});

/** Asked once the studio tour is completed (`manager.signal('onboarding-complete')`). */
export const feedbackSurvey = createSurvey({
  id: 'first-session-feedback',
  questions: [
    {
      id: 'score',
      type: 'nps',
      prompt: 'How likely are you to recommend Loopwork to a friend who makes music?',
    },
    {
      id: 'reason',
      type: 'text',
      prompt: 'What would make it a 10?',
      placeholder: 'Optional',
      optional: true,
      when: (answers) => Number(answers.score) < 9,
    },
  ],
  rules: { trigger: { signal: 'onboarding-complete' } },
  onSubmit: (answers) => {
    eventLog.setState((s) => ({
      events: [
        {
          type: 'survey_submitted',
          tourId: 'first-session-feedback',
          stepId: String(answers.score),
          timestamp: Date.now(),
        } as never,
        ...s.events,
      ].slice(0, 6),
    }));
  },
});
