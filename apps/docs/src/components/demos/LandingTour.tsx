import { MotionContent, MotionOverlay } from '@awesome-tour/motion';
import { createTour, Tour } from '@awesome-tour/react';
import { useEffect } from 'react';
import { CardBody } from './ui';

/** A tour of this very page. Started by any link to `#tour` (the hero's "Take the tour" button). */
const tour = createTour({
  id: 'docs-landing',
  onTargetMissing: 'skip', // header items are hidden on small screens
  targetTimeout: 300,
  steps: [
    {
      id: 'welcome',
      title: 'This page is the demo',
      description:
        'awesome-tour is running on the docs site itself — composed from unstyled primitives and animated with @awesome-tour/motion.',
    },
    {
      id: 'install',
      target: '.landing-install',
      title: 'One package',
      description: '@awesome-tour/react re-exports the headless core. Adapters are opt-in.',
    },
    {
      id: 'features',
      target: '.landing-features',
      side: 'top',
      title: 'Batteries included',
      description:
        'Interactive steps, branching, multi-page tours, persistence, analytics, checklists…',
    },
    {
      id: 'search',
      target: 'site-search > button',
      side: 'bottom',
      title: 'Search the docs',
      description: 'Every guide has live demos like this one.',
    },
    {
      id: 'theme',
      target: 'starlight-theme-select',
      side: 'bottom',
      interactive: true,
      title: 'Try the theme switch',
      description:
        'The highlighted target stays interactive. The tour UI follows your CSS — it has none of its own.',
    },
    {
      id: 'github',
      target: '.social-icons',
      side: 'bottom',
      title: 'Open source',
      description: 'MIT licensed. Issues and PRs welcome.',
    },
    {
      id: 'start',
      target: '.hero .actions',
      title: 'Ready?',
      description: 'Start with the quick start, or explore the guides.',
    },
  ],
});

export function LandingTour() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href$="#tour"]');
      if (!link) return;
      e.preventDefault();
      void tour.start({ force: true });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <Tour.Root tour={tour}>
      <Tour.Portal>
        <MotionOverlay padding={8} radius={12} />
        <MotionContent
          className="at-card"
          preset="slide"
          sideOffset={14}
          collisionPadding={16}
          animateStepChange
        >
          <Tour.Arrow className="at-arrow" width={14} height={7} />
          <CardBody />
        </MotionContent>
      </Tour.Portal>
    </Tour.Root>
  );
}
