import { Play, Search } from 'lucide-react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLoopwork, useLoopworkApp } from '../context';
import { SAMPLES } from '../store';

const ROW = 32;
const OVERSCAN = 4;
const HUES: Record<string, number> = {
  Kick: 1,
  Snare: 1,
  Hat: 1,
  Clap: 1,
  Bass: 2,
  Keys: 3,
  Vox: 4,
};

/** Slug used in `data-tour`: `sample-kick-dusty-01`. */
export const sampleSlug = (name: string) => `sample-${name.toLowerCase().replace(/\s+/g, '-')}`;

/**
 * 400 samples, virtualized: only the rows in view exist in the DOM. A tour pointing at a row far
 * down the list has to bring it into view first (`app.revealSample(name)` in `beforeEnter`).
 */
export function SampleBrowser({
  className,
  height = 240,
}: {
  className?: string;
  height?: number;
}) {
  const { app } = useLoopworkApp();
  const preview = useLoopwork((s) => s.preview);
  const revealed = useLoopwork((s) => s.revealed);
  const [query, setQuery] = React.useState('');
  const [scrollTop, setScrollTop] = React.useState(0);
  const viewport = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? SAMPLES.filter((s) => s.name.toLowerCase().includes(q)) : SAMPLES;
  }, [query]);

  // Reveal on request: clear a search that hides the sample, then scroll it to the middle.
  React.useEffect(() => {
    if (!revealed) return;
    let index = results.findIndex((s) => s.name === revealed);
    if (index < 0 && query) {
      setQuery('');
      return; // runs again with the full list
    }
    index = SAMPLES.findIndex((s) => s.name === revealed);
    if (index < 0 || !viewport.current) return;
    viewport.current.scrollTop = Math.max(0, index * ROW - height / 2 + ROW / 2);
    setScrollTop(viewport.current.scrollTop);
  }, [revealed, results, query, height]);

  const first = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN);
  const last = Math.min(results.length, Math.ceil((scrollTop + height) / ROW) + OVERSCAN);
  const visible = results.slice(first, last);

  return (
    <div
      role="group"
      data-tour="browser"
      aria-label="Sample browser"
      className={cn('flex min-w-0 flex-col gap-2 p-3', className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Samples</h2>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {results.length}
        </span>
      </div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          data-tour="browser-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setScrollTop(0);
            if (viewport.current) viewport.current.scrollTop = 0;
          }}
          placeholder="Search 400 samples"
          aria-label="Search samples"
          className="h-8 pl-8"
        />
      </div>
      <div
        ref={viewport}
        data-tour="browser-list"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="overflow-y-auto overscroll-contain rounded-md border"
        style={{ height }}
      >
        {results.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            No sample matches “{query}”. Try “kick”, “rhodes” or a tempo like “92”.
          </p>
        ) : (
          <ul aria-label="Samples" className="relative" style={{ height: results.length * ROW }}>
            {visible.map((sample, i) => {
              const index = first + i;
              const active = preview === sample.name;
              return (
                <li
                  key={sample.name}
                  data-tour={sampleSlug(sample.name)}
                  className="absolute inset-x-0"
                  style={{ top: index * ROW, height: ROW }}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => app.preview(sample.name)}
                    className={cn(
                      'group flex h-full w-full items-center gap-2 px-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent',
                      active && 'bg-accent font-medium',
                    )}
                    style={
                      { '--lane': `var(--chart-${HUES[sample.kind] ?? 1})` } as React.CSSProperties
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full bg-[var(--lane)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{sample.name}</span>
                    {sample.bpm && (
                      <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                        {sample.bpm}
                      </span>
                    )}
                    <Play
                      aria-hidden="true"
                      className={cn(
                        'size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                        active && 'fill-current opacity-100',
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
