import { createTour } from '@awesome-tour/core';
import { mountTour } from '@awesome-tour/elements';
import { LoopworkApp, parts } from '@loopwork';
import { Play } from 'lucide-react';
import { useEffect } from 'react';
import { DemoFrame, worldButton } from './ui';

const $ = parts('plain');

// A tour from @awesome-tour/core, rendered by @awesome-tour/elements: no React in the tour UI.
// (The page itself is React here; the same code runs in Vue, Svelte or a plain <script>.)
const tour = createTour({
  id: 'docs-vanilla',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'No React in this card',
      description: 'mountTour() draws it with plain DOM in a shadow root.',
    },
    {
      id: 'grid',
      target: $('sequencer'),
      side: 'top',
      title: 'Themed with CSS variables',
      description: 'This page sets --tour-bg, --tour-accent… on awesome-tour-layer.',
    },
    {
      id: 'mixer',
      target: $('mixer'),
      side: 'start',
      title: 'Same engine, same keys',
      description: 'Arrows, Escape, focus trap and announcements come built in.',
    },
  ],
});

export function VanillaDemo() {
  useEffect(() => mountTour(tour), []);
  return (
    <DemoFrame
      title="@awesome-tour/elements"
      actions={
        <button
          type="button"
          className={worldButton.primary}
          onClick={() => void tour.start({ force: true })}
        >
          <Play aria-hidden="true" />
          Start tour
        </button>
      }
    >
      <LoopworkApp scope="plain" layout="compact" />
    </DemoFrame>
  );
}
