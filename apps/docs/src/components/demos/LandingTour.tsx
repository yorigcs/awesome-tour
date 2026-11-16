import { createTour, Tour } from '@awesome-tour/react';
import { useEffect } from 'react';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';

/** Set once the tour has started on its own, so returning visitors are never interrupted. */
export const LANDING_SEEN_KEY = 'awesome-tour-landing-seen';

/**
 * A tour of this very page. Starts by itself once the hero diagram has assembled (first visit only),
 * and again from the "Take the tour" button. Non-modal: the page stays readable and usable.
 */
export const landingTour = createTour({
  id: 'docs-landing',
  modal: false,
  onTargetMissing: 'skip', // some header items are hidden on small screens
  targetTimeout: 300,
  steps: [
    {
      id: 'welcome',
      target: '[data-tour="parts-strip"]',
      side: 'top',
      title: 'This page is the demo',
      description:
        'A real tour, built from the six parts listed here. It is non-modal: keep reading, or step through.',
    },
    {
      id: 'install',
      target: '[data-tour="install"]',
      title: 'One package',
      description: '@awesome-tour/react re-exports the headless core. Adapters are opt-in.',
    },
    {
      id: 'parts',
      target: '[data-tour="parts"]',
      side: 'top',
      title: 'Take only what you need',
      description: 'Each package has a size budget checked in CI.',
    },
    {
      id: 'workbench',
      target: '[data-tour="workbench"]',
      side: 'top',
      title: 'Then rebuild it yourself',
      description: 'The workbench swaps parts while a tour runs and writes the code for you.',
    },
    {
      id: 'theme',
      target: '[data-theme-toggle]',
      side: 'bottom',
      interactive: true,
      title: 'Try the theme switch',
      description: 'The highlighted target stays clickable — the tour follows your CSS variables.',
    },
    {
      id: 'search',
      target: '[data-search-open]',
      side: 'bottom',
      title: 'Find any part',
      description: 'Every guide has live demos like this one, with its source a click away.',
    },
  ],
});

export function LandingTour() {
  useEffect(() => {
    const onAssembled = () => {
      let seen = false;
      try {
        seen = localStorage.getItem(LANDING_SEEN_KEY) !== null;
        localStorage.setItem(LANDING_SEEN_KEY, '1');
      } catch {}
      // Only if the visitor is still at the top: never yank someone who already scrolled away.
      if (!seen && scrollY < 200) void landingTour.start();
    };
    window.addEventListener('awesome-tour:assembled', onAssembled);
    return () => window.removeEventListener('awesome-tour:assembled', onAssembled);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as Element | null)?.closest?.(
        'a[href$="#tour"], [data-start-landing-tour]',
      );
      if (!trigger) return;
      e.preventDefault();
      void landingTour.start({ force: true });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <Tour.Root tour={landingTour}>
      <TourMotionPopover dots backdrop="spotlight" />
    </Tour.Root>
  );
}
