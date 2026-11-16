import { createTour, Tour, TourProvider } from '@awesome-tour/react';
import { HelpLauncher } from '@/components/awesome-tour/launcher';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, MockApp } from './ui';

const basics = createTour({
  id: 'docs-launcher-basics',
  steps: [
    {
      id: 'nav',
      target: '#launcher-nav',
      side: 'right',
      title: 'Navigation',
      description: 'Every area of the app lives here.',
    },
    {
      id: 'search',
      target: '#launcher-search',
      title: 'Search',
      description: 'Find anything in your workspace.',
    },
  ],
});

const projects = createTour({
  id: 'docs-launcher-projects',
  steps: [
    {
      id: 'new',
      target: '#launcher-new',
      title: 'Create a project',
      description: 'Projects group your reports.',
    },
  ],
});

export function LauncherDemo() {
  return (
    <TourProvider tours={[basics, projects]}>
      <DemoFrame
        title="Help launcher"
        actions={
          <HelpLauncher
            side="bottom"
            className="relative right-auto bottom-auto size-9 shadow-none"
            tours={[
              { tour: basics.id, title: 'The basics', description: 'Navigation and search.' },
              { tour: projects.id, title: 'Projects', description: 'Create your first one.' },
            ]}
            links={[{ title: 'Read the docs', href: '#' }]}
          />
        }
      >
        <MockApp id="launcher" />
      </DemoFrame>
      <Tour.Root tour={basics}>
        <TourPopover />
      </Tour.Root>
      <Tour.Root tour={projects}>
        <TourPopover />
      </Tour.Root>
    </TourProvider>
  );
}
