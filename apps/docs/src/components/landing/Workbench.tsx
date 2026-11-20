import { createTour, Tour } from '@awesome-tour/react';
import { LoopworkApp, parts } from '@loopwork';
import { Check, Copy } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import {
  TourCard,
  TourCardContents,
  TourOverlay,
  TourSpotlight,
} from '@/components/awesome-tour/tour';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';
import { cn } from '@/lib/utils';
import { landingTour } from '../demos/LandingTour';
import { StartButton } from '../demos/ui';

const bench = parts('bench');

export const workbenchTour = createTour({
  id: 'workbench',
  // Non-modal: the options panel stays usable (and above the overlay) while the tour runs.
  modal: false,
  // It runs by itself while the bench is on screen: never scroll the page from under the reader.
  scroll: false,
  steps: [
    {
      id: 'beat',
      target: [bench('row-kick'), bench('row-snare')],
      side: 'bottom',
      title: 'Change a part',
      description:
        'Flip any option on the left while this step is open — the tour updates in place.',
    },
    {
      id: 'transport',
      target: bench('transport'),
      title: 'Transport',
      description: 'Every option maps to a prop or a part. The code below follows along.',
    },
    {
      id: 'mixer',
      target: bench('mixer'),
      side: 'left',
      title: 'Mixer',
      description: 'It is your component now: copy the code, change any class.',
    },
    {
      id: 'arrangement',
      target: bench('arrangement'),
      title: 'Arrangement',
      description: 'Steps can point anywhere: one element, several, or none at all.',
    },
  ],
});

type Backdrop = 'overlay' | 'spotlight' | 'none';
type Footer = 'back' | 'dots' | 'skip';
type Size = 'sm' | 'default' | 'lg';

interface Options {
  backdrop: Backdrop;
  footer: Footer;
  size: Size;
  motion: boolean;
  progress: boolean;
}

const tour = workbenchTour;

function Choice<T extends string | boolean>({
  letter,
  legend,
  value,
  options,
  onChange,
}: {
  letter: string;
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex items-center gap-2 text-sm font-bold">
        <span className="part-disc size-6 text-[0.6875rem]">{letter}</span>
        {legend}
      </legend>
      <div className="flex rounded-sm border-2 border-ink">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className="relative flex-1 cursor-pointer border-ink text-center text-sm font-semibold not-first:border-l-2 has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="block px-2 py-1.5">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function codeFor(o: Options) {
  const props = [
    o.size !== 'default' && `size="${o.size}"`,
    !o.progress && 'progress={false}',
    o.footer === 'dots' && 'dots',
    o.footer === 'skip' && 'skip',
  ].filter(Boolean) as string[];
  if (o.motion) {
    const all = [o.backdrop !== 'overlay' && `backdrop="${o.backdrop}"`, ...props].filter(Boolean);
    return `// npx shadcn add @awesome-tour/tour-motion
import { Tour } from '@awesome-tour/react';
import { TourMotionPopover } from '@/components/awesome-tour/tour-motion';

<Tour.Root tour={tour}>
  <TourMotionPopover${all.length ? ` ${all.join(' ')}` : ''} />
</Tour.Root>`;
  }
  const parts = ['TourCard', 'TourCardContents'];
  if (o.backdrop === 'overlay') parts.unshift('TourOverlay');
  if (o.backdrop === 'spotlight') parts.unshift('TourSpotlight');
  const contents = props.filter((p) => !p.startsWith('size'));
  const size = props.find((p) => p.startsWith('size'));
  return `// npx shadcn add @awesome-tour/tour
import { Tour } from '@awesome-tour/react';
import { ${parts.join(', ')} } from '@/components/awesome-tour/tour';

<Tour.Root tour={tour}>
  <Tour.Portal>${o.backdrop === 'overlay' ? '\n    <TourOverlay />' : ''}${o.backdrop === 'spotlight' ? '\n    <TourSpotlight />' : ''}
    <TourCard${size ? ` ${size}` : ''}>
      <TourCardContents${contents.length ? ` ${contents.join(' ')}` : ''} />
    </TourCard>
  </Tour.Portal>
</Tour.Root>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-ink"
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * Keeps the bench's tour open while the bench is on screen, so the preview always shows a live step
 * that re-renders as options change. Steps aside whenever the page's own tour is open.
 */
function useLiveBench(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    const sync = () => {
      const landingOpen = landingTour.isOpen();
      if (visible && !landingOpen && !tour.isOpen()) void tour.start({ force: true });
      if ((!visible || landingOpen) && tour.isOpen()) tour.close();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = (entry?.intersectionRatio ?? 0) >= 0.45;
        sync();
      },
      { threshold: [0, 0.45, 1] },
    );
    io.observe(el);
    const off = landingTour.subscribe(sync);
    return () => {
      io.disconnect();
      off();
      tour.close();
    };
  }, [ref]);
}

export function Workbench() {
  const benchRef = useRef<HTMLDivElement>(null);
  useLiveBench(benchRef);
  const [o, setO] = useState<Options>({
    backdrop: 'spotlight',
    footer: 'dots',
    size: 'default',
    motion: true,
    progress: true,
  });
  const set =
    <K extends keyof Options>(key: K) =>
    (value: Options[K]) =>
      setO((s) => ({ ...s, [key]: value }));
  const code = codeFor(o);
  const contents = (
    <TourCardContents progress={o.progress} dots={o.footer === 'dots'} skip={o.footer === 'skip'} />
  );

  return (
    <Tour.Root tour={tour}>
      <div
        ref={benchRef}
        data-tour="workbench"
        className="grid border-2 border-ink lg:grid-cols-[18rem_minmax(0,1fr)]"
      >
        <div
          data-tour-keep=""
          className="relative z-[52] flex flex-col gap-6 border-b-2 border-ink bg-paper p-5 lg:border-r-2 lg:border-b-0"
        >
          <Choice
            letter="A"
            legend="Backdrop"
            value={o.backdrop}
            onChange={set('backdrop')}
            options={[
              { value: 'overlay', label: 'Overlay' },
              { value: 'spotlight', label: 'Ring' },
              { value: 'none', label: 'None' },
            ]}
          />
          <Choice
            letter="B"
            legend="Card size"
            value={o.size}
            onChange={set('size')}
            options={[
              { value: 'sm', label: 'S' },
              { value: 'default', label: 'M' },
              { value: 'lg', label: 'L' },
            ]}
          />
          <Choice
            letter="D"
            legend="Progress"
            value={o.progress}
            onChange={set('progress')}
            options={[
              { value: true, label: 'Shown' },
              { value: false, label: 'Hidden' },
            ]}
          />
          <Choice
            letter="E"
            legend="Footer"
            value={o.footer}
            onChange={set('footer')}
            options={[
              { value: 'back', label: 'Back' },
              { value: 'dots', label: 'Dots' },
              { value: 'skip', label: 'Skip' },
            ]}
          />
          <Choice
            letter="M"
            legend="Motion"
            value={o.motion}
            onChange={set('motion')}
            options={[
              { value: true, label: 'Springs' },
              { value: false, label: 'CSS' },
            ]}
          />
          <div className="mt-auto pt-2">
            <StartButton className="w-full justify-center">Restart the tour</StartButton>
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="bg-paper-2 p-3 sm:p-5">
            <LoopworkApp scope="bench" />
          </div>
          <div className="border-t-2 border-ink">
            <div className="flex items-center justify-between border-b border-rule bg-paper-2 py-1 pr-2 pl-4">
              <span className="font-mono text-xs font-semibold">Onboarding.tsx</span>
              <CopyButton text={code} />
            </div>
            <pre
              aria-live="polite"
              className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed"
            >
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>

      {o.motion ? (
        <TourMotionPopover
          backdrop={o.backdrop}
          size={o.size}
          progress={o.progress}
          dots={o.footer === 'dots'}
          skip={o.footer === 'skip'}
        />
      ) : (
        <Tour.Portal>
          {o.backdrop === 'overlay' && <TourOverlay />}
          {o.backdrop === 'spotlight' && <TourSpotlight />}
          <TourCard size={o.size} className={cn(o.backdrop === 'none' && 'shadow-2xl')}>
            {contents}
          </TourCard>
        </Tour.Portal>
      )}
    </Tour.Root>
  );
}
