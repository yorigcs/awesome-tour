import { createTour, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { useEffect, useState } from 'react';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

const $ = parts('heard');

const tour = createTour({
  id: 'docs-a11y',
  steps: [
    {
      id: 'transport',
      target: $('transport'),
      title: 'Transport',
      description: 'Play, stop and record.',
    },
    {
      id: 'grid',
      target: $('sequencer'),
      title: 'The beat grid',
      description: 'Arrow keys move between cells; Space toggles a hit.',
    },
    {
      id: 'knob',
      target: $('knob-bass'),
      side: 'left',
      title: 'Bass level',
      description: 'A slider: ↑ and ↓ change it, and the tour leaves those keys alone.',
    },
  ],
});

interface Line {
  id: number;
  kind: 'focus' | 'dialog' | 'live';
  text: string;
}

/**
 * Approximates what a screen reader conveys: where focus lands (with the element's role and
 * accessible name) and what the live region announces. Built from the real DOM, not from props.
 */
function useTranscript() {
  const [lines, setLines] = useState<Line[]>([]);
  useEffect(() => {
    let n = 0;
    const push = (kind: Line['kind'], text: string) =>
      setLines((l) => [...l.slice(-7), { id: n++, kind, text }]);

    const label = (el: Element) => {
      const ids = (attr: string) =>
        (el.getAttribute(attr) ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean)
          .join(' ');
      return (
        el.getAttribute('aria-label') ?? (ids('aria-labelledby') || el.textContent?.trim() || '')
      );
    };
    const onFocus = (event: FocusEvent) => {
      const el = event.target as Element;
      if (!el.closest?.('[role=dialog], #heard')) return;
      const role = el.getAttribute('role') ?? el.tagName.toLowerCase();
      if (role === 'dialog') {
        const description = (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean)
          .join(' ');
        push('dialog', `dialog, ${label(el)}. ${description}`);
      } else {
        const value = el.getAttribute('aria-valuetext');
        push('focus', `${label(el)}, ${role}${value ? `, ${value}` : ''}`);
      }
    };
    document.addEventListener('focusin', onFocus);

    const live = new MutationObserver(() => {
      const region = document.querySelector('#heard-announcer [data-tour-announcer]');
      const text = region?.textContent?.trim();
      if (text) push('live', text);
    });
    const host = document.getElementById('heard-announcer');
    if (host) live.observe(host, { childList: true, subtree: true, characterData: true });

    const off = tour.on('start', () => setLines([]));
    return () => {
      document.removeEventListener('focusin', onFocus);
      live.disconnect();
      off();
    };
  }, []);
  return lines;
}

const KIND = { focus: 'focus', dialog: 'opens', live: 'polite' } as const;

function Transcript() {
  const lines = useTranscript();
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-ink">What a screen reader gets</p>
      {lines.length === 0 ? (
        <p>Start the tour with the keyboard (Tab to “Start tour”, Enter), then use ← → and Tab.</p>
      ) : (
        <ol className="flex flex-col gap-0.5 font-mono">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-2">
              <span className="w-12 shrink-0 text-ink-2">{KIND[line.kind]}</span>
              <span className="text-ink">{line.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AccessibilityDemo() {
  return (
    <div id="heard-announcer">
      <Tour.Root tour={tour}>
        <DemoFrame title="Heard, not just seen" actions={<StartButton />} footer={<Transcript />}>
          <LoopworkApp scope="heard" layout="compact" />
        </DemoFrame>
        <TourPopover />
      </Tour.Root>
    </div>
  );
}
