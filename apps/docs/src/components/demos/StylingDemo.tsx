import { createTour, Tour } from '@awesome-tour/react';
import { useState } from 'react';
import {
  TourCard,
  TourCardContents,
  TourOverlay,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { DemoFrame, MockApp, StartButton, worldButton } from './ui';

const tour = createTour({
  id: 'docs-styling',
  steps: [
    {
      id: 'nav',
      target: '#styling-nav',
      side: 'right',
      title: 'Same tour',
      description: 'Only class names change between themes.',
    },
    {
      id: 'new',
      target: '#styling-new',
      title: 'Your design system',
      description: 'Style with data-state, data-side and CSS variables.',
    },
    {
      id: 'stats',
      target: '#styling-stat-2',
      title: 'No CSS shipped',
      description: 'Nothing to override, nothing to fight.',
    },
  ],
});

/** Each theme is just a different set of Tailwind classes on the same parts. */
const themes = {
  default: { card: '', overlay: true },
  glass: {
    card: 'border-white/20 bg-popover/60 shadow-2xl backdrop-blur-xl [&_[data-tour-arrow]]:hidden',
    overlay: true,
  },
  brutal: {
    card: 'rounded-none border-2 border-foreground shadow-[6px_6px_0_0_var(--color-foreground)] [&_[data-slot=tour-card-frame]]:rounded-none [&_[data-tour-arrow]]:hidden',
    overlay: true,
  },
  spotlight: { card: '', overlay: false },
} as const;

type Theme = keyof typeof themes;

export function StylingDemo() {
  const [theme, setTheme] = useState<Theme>('glass');
  const t = themes[theme];
  return (
    <Tour.Root tour={tour}>
      <DemoFrame
        title="Styling"
        actions={
          <>
            <fieldset className="flex items-center gap-0 rounded-sm border-2 border-ink">
              <legend className="sr-only">Theme</legend>
              {(Object.keys(themes) as Theme[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  aria-pressed={theme === k}
                  onClick={() => setTheme(k)}
                  className={`${worldButton.secondary} h-8 rounded-none border-0 capitalize`}
                >
                  {k}
                </button>
              ))}
            </fieldset>
            <StartButton />
          </>
        }
      >
        <MockApp id="styling" />
      </DemoFrame>
      <Tour.Portal>
        {t.overlay ? <TourOverlay /> : <TourSpotlight />}
        <TourCard className={t.card}>
          <TourCardContents />
        </TourCard>
      </Tour.Portal>
    </Tour.Root>
  );
}
