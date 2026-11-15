import { ArrowLeft, ArrowRight, Plus, Search, X } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { landingTour } from '../demos/LandingTour';

/**
 * The hero's exploded diagram: the parts of a tour UI, lettered like an assembly manual, that snap
 * together over a small app. Positions are in container-width units (cqw) so it scales as a drawing.
 */

interface Part {
  letter: string;
  name: string;
  /** Exploded offset, in cqw. */
  dx: number;
  dy: number;
  /** Label position relative to the part when exploded. */
  label: 'top' | 'bottom' | 'left' | 'right' | 'inside';
  delay: number;
}

const PARTS = {
  overlay: { letter: 'A', name: 'Tour.Overlay', dx: -1.5, dy: 1.5, label: 'inside', delay: 0 },
  content: { letter: 'B', name: 'Tour.Content', dx: -9, dy: 13, label: 'left', delay: 90 },
  arrow: { letter: 'C', name: 'Tour.Arrow', dx: 0, dy: -3.5, label: 'left', delay: 160 },
  progress: { letter: 'D', name: 'Tour.Progress', dx: -9, dy: -4, label: 'top', delay: 220 },
  nav: { letter: 'E', name: 'Tour.Prev / Next', dx: -9, dy: 28, label: 'bottom', delay: 280 },
  close: { letter: 'F', name: 'Tour.Close', dx: 4, dy: -6, label: 'left', delay: 330 },
} satisfies Record<string, Part>;

function Callout({ part, exploded, active }: { part: Part; exploded: boolean; active: boolean }) {
  const pos = {
    top: 'bottom-full left-0 mb-[1cqw]',
    bottom: 'top-full left-0 mt-[1cqw]',
    inside: 'bottom-[2cqw] left-[2cqw]',
    left: 'right-full top-1/2 -translate-y-1/2 mr-[0.6cqw] flex-row-reverse',
    right: 'left-full top-1/2 -translate-y-1/2 ml-[0.6cqw]',
  }[part.label];
  const leader = part.label === 'left' || part.label === 'right';
  return (
    <span
      aria-hidden="true"
      data-callout=""
      className={cn(
        'pointer-events-none absolute flex items-center gap-[0.8cqw] whitespace-nowrap',
        pos,
      )}
    >
      {leader && <span className="w-[2.4cqw] border-t-[0.3cqw] border-dashed border-ink" />}
      <span
        className={cn(
          'part-disc size-[4.2cqw] text-[1.8cqw] transition-[background-color,color,scale] duration-200',
          active && 'scale-115 bg-marker text-marker-ink ring-[0.3cqw] ring-ink',
        )}
      >
        {part.letter}
      </span>
      <span
        className={cn(
          'rounded-sm bg-paper px-[0.6cqw] font-mono text-[1.7cqw] font-semibold text-ink transition-opacity duration-300',
          exploded || active ? 'opacity-100' : 'opacity-0',
        )}
      >
        {part.name}
      </span>
    </span>
  );
}

function piece(part: Part, exploded: boolean): React.CSSProperties {
  return {
    transform: exploded ? `translate(${part.dx}cqw, ${part.dy}cqw)` : 'translate(0, 0)',
    transitionDelay: `${exploded ? 0 : part.delay}ms`,
  };
}

const MOVE =
  'transition-transform duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

export function HeroAssembly() {
  const [exploded, setExploded] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  // While the page's real tour is open, the drawing's own card steps back: one tour at a time.
  const liveTour = useSyncExternalStore(
    landingTour.subscribe,
    () => landingTour.isOpen(),
    () => false,
  );

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const snap = setTimeout(() => setExploded(false), reduced ? 0 : 1400);
    // Tell the landing tour the parts are in place: it starts once the snap has settled.
    const done = setTimeout(
      () => window.dispatchEvent(new CustomEvent('awesome-tour:assembled')),
      reduced ? 0 : 1400 + 750 + 400,
    );
    return () => {
      clearTimeout(snap);
      clearTimeout(done);
    };
  }, []);
  const ring = (letter: string) =>
    active === letter ? 'outline-[0.5cqw] outline-offset-[0.4cqw] outline-marker' : '';

  return (
    <figure className="relative">
      <div
        data-tour="hero-diagram"
        data-ghost={liveTour ? '' : undefined}
        className={cn(
          'relative aspect-[6/5] w-full [container-type:inline-size]',
          // While the live tour runs, the drawn card becomes a dashed outline on paper: the parts
          // keep their letters, but nothing reads as a second tour.
          '[&[data-ghost]_[data-part]>:not([data-callout])]:invisible',
          '[&[data-ghost]_[data-part=B]]:border-dashed [&[data-ghost]_[data-part=B]]:shadow-none',
        )}
        role="img"
        aria-label={
          exploded
            ? 'Exploded view of a tour: overlay, content card, arrow, progress, previous and next buttons, close button.'
            : 'The parts assembled: a tour card points at the “New project” button of a small app, the rest of the app dimmed.'
        }
      >
        {/* The app being toured (drawn neutral: it's "your app") */}
        <div
          data-app=""
          className={cn(
            'absolute inset-x-[3cqw] top-[4cqw] bottom-[4cqw] overflow-hidden rounded-[1.4cqw] border bg-background text-foreground shadow-[0_2cqw_5cqw_-2cqw_rgb(0_0_0/0.25)] transition-[opacity,filter] duration-500',
            exploded && 'opacity-30 grayscale',
          )}
        >
          <div className="flex h-full">
            <div className="flex w-[22%] flex-col gap-[1.6cqw] border-r bg-sidebar p-[2.4cqw]">
              <span className="mb-[1cqw] flex items-center gap-[1.2cqw] text-[2.2cqw] font-bold">
                <span className="size-[3.6cqw] rounded-[0.8cqw] bg-primary" />
                Acme
              </span>
              {[70, 55, 62, 48].map((w, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static drawing
                  key={i}
                  className={cn(
                    'h-[1.6cqw] rounded-full border-[0.25cqw] border-foreground/25',
                    i === 0 && 'border-foreground/60',
                  )}
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-[2.4cqw] p-[2.6cqw]">
              <div className="flex items-center gap-[1.6cqw]">
                <span className="flex h-[5.4cqw] flex-1 items-center gap-[1cqw] rounded-[1cqw] border px-[1.4cqw] text-[1.9cqw] text-muted-foreground">
                  <Search className="size-[2.2cqw]" />
                  Search…
                </span>
                <span className="flex h-[5.4cqw] w-[30%] items-center justify-center gap-[0.8cqw] rounded-[1cqw] bg-primary text-[1.9cqw] font-semibold text-primary-foreground">
                  <Plus className="size-[2.2cqw]" />
                  New project
                </span>
              </div>
              <div className="grid grid-cols-3 gap-[1.6cqw]">
                {['Revenue', 'Users', 'Churn'].map((label, i) => (
                  <div
                    key={label}
                    className="flex flex-col gap-[0.8cqw] rounded-[1cqw] border p-[1.6cqw]"
                  >
                    <span className="text-[1.6cqw] text-muted-foreground">{label}</span>
                    <span className="text-[3cqw] font-bold tabular-nums">
                      {['$48.2k', '1,284', '2.1%'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex-1 rounded-[1cqw] border p-[1.6cqw]">
                <div className="flex h-full items-end gap-[1.2cqw]">
                  {[38, 52, 45, 70, 62, 84, 58, 76, 66, 90].map((h, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: static drawing
                      key={i}
                      className="flex-1 rounded-t-[0.5cqw] border-[0.3cqw] border-b-0 border-foreground/35"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* A — overlay: dims the app, cutout around the target */}
        <div
          className={cn(
            'absolute inset-x-[3cqw] top-[4cqw] bottom-[4cqw] rounded-[1.4cqw]',
            MOVE,
            ring('A'),
          )}
          style={piece(PARTS.overlay, exploded)}
        >
          <svg
            className={cn(
              'absolute inset-0 size-full overflow-visible rounded-[1.4cqw] transition-[outline-color] duration-300',
              exploded ? 'outline-2 outline-ink outline-dashed' : 'outline-transparent',
            )}
            viewBox="0 0 94 75.33"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 0H94V75.33H0Z M70 1.6H92.4V9H70Z"
              fillRule="evenodd"
              className={cn(
                'transition-[fill-opacity] duration-500',
                exploded ? 'fill-ink/[0.06]' : 'fill-ink/35 dark:fill-black/55',
              )}
            />
          </svg>
          <Callout part={PARTS.overlay} exploded={exploded} active={active === 'A'} />
        </div>
        {/* Spotlight ring on the target, part of the overlay's cutout */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-[5.6cqw] left-[73cqw] h-[7.4cqw] w-[22.4cqw] rounded-[1.2cqw] ring-[0.5cqw] ring-marker transition-opacity duration-300',
            exploded ? 'opacity-0' : 'opacity-100 delay-700',
          )}
        />

        {/* B — the card */}
        <div
          className={cn(
            'absolute top-[17cqw] left-[39cqw] w-[54cqw] rounded-[1cqw] border-[0.35cqw] border-ink bg-paper text-ink shadow-[0_2.5cqw_5cqw_-2.5cqw_rgb(0_0_0/0.5)]',
            MOVE,
            ring('B'),
          )}
          data-part="B"
          style={piece(PARTS.content, exploded)}
        >
          <div className="flex flex-col gap-[1.6cqw] p-[3cqw]">
            <div
              className={cn(
                'h-[4.6cqw] w-[72%]',
                cn(
                  'rounded-[0.6cqw] border-[0.25cqw] border-dashed transition-colors duration-300',
                  exploded ? 'border-ink/40' : 'border-transparent',
                ),
              )}
            />
            <p className="font-display text-[3.4cqw] leading-tight">Create a project</p>
            <p className="text-[2.15cqw] leading-snug text-ink-2">
              Projects group your reports. Click the button to continue.
            </p>
            <div
              className={cn(
                'h-[5cqw]',
                cn(
                  'rounded-[0.6cqw] border-[0.25cqw] border-dashed transition-colors duration-300',
                  exploded ? 'border-ink/40' : 'border-transparent',
                ),
              )}
            />
          </div>
          <Callout part={PARTS.content} exploded={exploded} active={active === 'B'} />
        </div>

        {/* C — arrow */}
        <span
          className={cn('absolute top-[14.65cqw] left-[81.5cqw] block', MOVE, ring('C'))}
          data-part="C"
          style={piece(PARTS.arrow, exploded)}
        >
          <svg viewBox="0 0 30 16" className="block w-[5cqw]" aria-hidden="true">
            <path
              d="M0 16 15 1 30 16Z"
              className="fill-paper stroke-ink"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          <Callout part={PARTS.arrow} exploded={exploded} active={active === 'C'} />
        </span>

        {/* D — progress */}
        <div
          className={cn(
            'absolute top-[19.1cqw] left-[41cqw] flex w-[40cqw] flex-col gap-[0.8cqw] rounded-[0.6cqw] bg-paper p-[1cqw]',
            MOVE,
            ring('D'),
          )}
          data-part="D"
          style={piece(PARTS.progress, exploded)}
        >
          <span className="text-[1.75cqw] font-semibold text-ink-2 tabular-nums">Step 2 of 4</span>
          <span className="h-[0.9cqw] overflow-hidden rounded-full bg-paper-2 ring-1 ring-ink/10">
            <span className="block h-full w-1/2 rounded-full bg-ink" />
          </span>
          <Callout part={PARTS.progress} exploded={exploded} active={active === 'D'} />
        </div>

        {/* F — close */}
        <span
          className={cn(
            'absolute top-[19.1cqw] left-[86.2cqw] grid size-[4.4cqw] place-items-center rounded-full bg-paper',
            MOVE,
            ring('F'),
          )}
          data-part="F"
          style={piece(PARTS.close, exploded)}
        >
          <X className="size-[2.6cqw]" strokeWidth={2.5} aria-hidden="true" />
          <Callout part={PARTS.close} exploded={exploded} active={active === 'F'} />
        </span>

        {/* E — navigation */}
        <div
          className={cn(
            'absolute top-[38.1cqw] left-[41cqw] flex w-[50cqw] items-center justify-between rounded-[0.6cqw] bg-paper p-[1cqw]',
            MOVE,
            ring('E'),
          )}
          data-part="E"
          style={piece(PARTS.nav, exploded)}
        >
          <span className="flex items-center gap-[0.8cqw] text-[2cqw] font-semibold">
            <ArrowLeft className="size-[2.2cqw]" />
            Back
          </span>
          <span className="flex items-center gap-[0.8cqw] rounded-[0.8cqw] border-[0.3cqw] border-ink bg-marker px-[2cqw] py-[1cqw] text-[2cqw] font-bold text-marker-ink">
            Next
            <ArrowRight className="size-[2.2cqw]" />
          </span>
          <Callout part={PARTS.nav} exploded={exploded} active={active === 'E'} />
        </div>
      </div>
      <figcaption className="mt-4 flex flex-col gap-3">
        <ol
          data-tour="parts-strip"
          className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3"
          aria-label="Parts"
        >
          {Object.values(PARTS).map((p) => (
            <li key={p.letter}>
              <button
                type="button"
                onMouseEnter={() => setActive(p.letter)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p.letter)}
                onBlur={() => setActive(null)}
                className="flex w-full items-center gap-1.5 rounded-sm py-1 text-left text-xs transition-colors hover:bg-paper-2"
              >
                <span
                  className={cn(
                    'part-disc size-5 text-[0.625rem]',
                    active === p.letter && 'bg-marker text-marker-ink',
                  )}
                >
                  {p.letter}
                </span>
                <span className="min-w-0 truncate font-mono font-semibold">{p.name}</span>
                <span className="ml-auto pr-1 font-mono text-ink-2">1×</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-rule pt-3 text-sm text-ink-2">
          <span>
            {liveTour
              ? 'The live tour has taken this card’s place.'
              : exploded
                ? 'Six parts, all unstyled primitives.'
                : 'Assembled: one tour step, styled by you.'}
          </span>
          <button
            type="button"
            onClick={() => setExploded((e) => !e)}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border-2 border-ink px-2.5 font-semibold text-ink transition-colors hover:bg-paper-2"
          >
            {exploded ? 'Assemble' : 'Take apart'}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
