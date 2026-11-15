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
import { router } from './router';

/** Last analytics events, shown in the playground (would go to Segment/PostHog in an app). */
export const eventLog = createStore<{ events: TourAnalyticsEvent[] }>({ events: [] });
const track = (event: TourAnalyticsEvent) => {
  eventLog.setState((s) => ({ events: [event, ...s.events].slice(0, 6) }));
};

export interface OnboardingData {
  role: 'admin' | 'member';
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Acme',
    description: 'A 60-second tour of the essentials. Use ← → or the buttons to move around.',
  },
  {
    id: 'sidebar',
    target: anchor('nav'),
    side: 'right',
    title: 'Navigation',
    description:
      'Every area of the app lives here. Targets are registered with anchors, not selectors.',
  },
  {
    id: 'search',
    target: '#search',
    interactive: true,
    title: 'Try the search',
    description: 'Type at least 3 characters — the tour continues by itself.',
    advanceOn: {
      when: () =>
        ((document.querySelector('#search') as HTMLInputElement | null)?.value.length ?? 0) >= 3,
    },
  },
  {
    id: 'create',
    target: anchor('create'),
    title: 'Create a project',
    description: 'Click the button to continue.',
    advanceOn: { event: 'click' },
  },
  {
    id: 'admin',
    target: '#admin-panel',
    when: (ctx) => ctx.data.role === 'admin',
    title: 'Admin panel',
    description: 'Only admins see this step — steps can be conditional.',
  },
  {
    id: 'projects',
    route: '/projects',
    target: '#project-list',
    side: 'left',
    title: 'Projects page',
    description:
      'Tours can span pages: the router adapter navigates here before resolving the target.',
  },
  {
    id: 'late',
    route: '/projects',
    target: '#analytics-widget',
    onTargetMissing: 'wait',
    title: 'Lazy content',
    description: 'This widget loads asynchronously. The tour waited for it to appear.',
  },
  {
    id: 'scroll',
    route: '/projects',
    target: '#deep-item',
    title: 'Scroll containers',
    description: 'Targets inside nested scroll containers are scrolled into view.',
  },
  {
    id: 'model',
    route: '/3d',
    target: anchor('engine'),
    title: '3D targets',
    description:
      'With @awesome-tour/three, objects inside a react-three-fiber scene can be highlighted.',
  },
  {
    id: 'stats',
    route: '/',
    target: ['#stat-1', '#stat-3'],
    title: 'Multiple targets',
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
  data: { role: 'admin' } as OnboardingData,
  steps,
  router,
  plugins: [persist(localStorageAdapter()), analytics(track)],
});

export const gettingStarted = createChecklist({
  id: 'getting-started',
  persistence: localStorageAdapter<ChecklistSnapshot>({ prefix: 'awesome-checklist:' }),
  items: [
    { id: 'onboarding', tour: 'onboarding', meta: { title: 'Take the product tour' } },
    { id: 'css-tour', tour: 'css-tour', meta: { title: 'Try the CSS-only tour' } },
    { id: 'search', signal: 'searched', meta: { title: 'Search for something' } },
    { id: 'project', signal: 'project-created', meta: { title: 'Create a project' } },
  ],
});

/**
 * A one-step announcement with display rules: it starts by itself on /projects (when no other
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
      title: 'New: project table',
      description: 'Owners and status at a glance. Sorting and filters are next.',
    },
  ],
  rules: {
    trigger: { route: '/projects' },
    frequency: { once: true, maxShows: 3 },
  },
});

export const impressions = localStorageAdapter<ImpressionRecord>({
  prefix: 'awesome-impressions:',
});
