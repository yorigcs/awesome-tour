import { createTour, Tour } from '@awesome-tour/react';
import { Frame, MockApp, TourCard } from './ui';

const tour = createTour({
  id: 'docs-basic',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Acme 👋',
      description: 'A step without a target is centered. Use ← → or the buttons to move around.',
    },
    {
      id: 'nav',
      target: '#basic-nav',
      side: 'right',
      title: 'Navigation',
      description: 'Every area of the app lives here.',
    },
    {
      id: 'search',
      target: '#basic-search',
      title: 'Search',
      description: 'Find anything in your workspace.',
    },
    {
      id: 'new',
      target: '#basic-new',
      title: 'Create a project',
      description: 'Projects group your reports and dashboards.',
    },
    {
      id: 'stats',
      target: ['#basic-stat-1', '#basic-stat-3'],
      title: 'Multiple targets',
      description: 'A step can highlight several elements at once.',
    },
  ],
});

export function BasicDemo() {
  return (
    <Tour.Root tour={tour}>
      <Frame
        title="Live demo"
        actions={<Tour.Trigger className="at-button at-button--primary">Start tour</Tour.Trigger>}
      >
        <MockApp id="basic" />
      </Frame>
      <TourCard />
    </Tour.Root>
  );
}
