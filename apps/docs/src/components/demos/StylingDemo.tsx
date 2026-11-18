import { createTour, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { useState } from 'react';
import {
  TourCard,
  TourCardContents,
  TourOverlay,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton, worldButton } from './ui';

const $ = parts('styled');

const tour = createTour({
  id: 'docs-styling',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'Same tour',
      description: 'Only class names change between these themes.',
    },
    {
      id: 'beat',
      target: $('sequencer'),
      title: 'Your design system',
      description: 'Style with data-state, data-side and CSS variables.',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'left',
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
  lcd: {
    card: 'rounded-sm border-[#2b3324] bg-[#141a10] font-mono text-[#c6f07c] [&_*]:text-inherit [&_[data-slot=tour-card-frame]]:rounded-sm [&_[data-tour-arrow]]:fill-[#141a10] [&_button]:rounded-sm [&_button]:border [&_button]:border-[#c6f07c]/40 [&_button]:bg-transparent [&_[data-state=active]]:bg-[#c6f07c]',
    overlay: true,
  },
  spotlight: { card: '', overlay: false },
  // Same card, docked to the bottom like a mobile hint (`layout="auto"` does it below 640px).
  sheet: { card: '', overlay: true, layout: 'sheet' },
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
                  className={`${worldButton.secondary} h-8 rounded-none border-0 ${k === 'lcd' ? 'uppercase' : 'capitalize'}`}
                >
                  {k}
                </button>
              ))}
            </fieldset>
            <StartButton />
          </>
        }
      >
        <LoopworkApp scope="styled" layout="compact" />
      </DemoFrame>
      <Tour.Portal>
        {t.overlay ? <TourOverlay /> : <TourSpotlight />}
        <TourCard className={t.card} layout={'layout' in t ? t.layout : 'auto'}>
          <TourCardContents />
        </TourCard>
      </Tour.Portal>
    </Tour.Root>
  );
}
