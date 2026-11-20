import { Drum, Mic, Piano, Waves } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useLoopwork } from '../context';
import { CHANNELS, type ChannelId } from '../store';

const BARS = 8;
const ICONS: Record<ChannelId, typeof Drum> = { drums: Drum, bass: Waves, keys: Piano, vox: Mic };

/** Deterministic waveform bars for a clip (geometry from its name, not random per render). */
function Waveform({ seed, bars }: { seed: string; bars: number }) {
  const heights = React.useMemo(() => {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return Array.from({ length: bars * 12 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const beat = i % 12 === 0 ? 0.35 : 0;
      return 0.2 + ((h >>> 16) % 100) / 180 + beat;
    });
  }, [seed, bars]);
  return (
    <svg
      viewBox={`0 0 ${heights.length} 1`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-5 w-full"
    >
      {heights.map((v, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length, never reordered
          key={i}
          x={i + 0.15}
          y={(1 - Math.min(v, 1)) / 2}
          width={0.7}
          height={Math.min(v, 1)}
          className="fill-[var(--lane)]"
        />
      ))}
    </svg>
  );
}

export function Arrangement({ className }: { className?: string }) {
  const clips = useLoopwork((s) => s.clips);
  const position = useLoopwork((s) => s.position);
  const playing = useLoopwork((s) => s.playing);
  const mixer = useLoopwork((s) => s.mixer);

  return (
    <div
      role="group"
      data-tour="arrangement"
      aria-label="Arrangement"
      className={cn('flex min-w-0 flex-col', className)}
    >
      <div
        className="overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        data-tour="arrangement-scroll"
        // Scrollable regions must be reachable by keyboard (arrow keys scroll it once focused).
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a keyboard-scrollable region
        tabIndex={0}
        role="group"
        aria-label="Timeline, 8 bars"
      >
        <div className="relative grid min-w-[44rem] grid-cols-[6.5rem_1fr]">
          {/* Ruler */}
          <div className="sticky left-0 z-10 border-r border-b bg-background" />
          <ol
            className="grid border-b text-[0.6875rem] text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${BARS}, 1fr)` }}
          >
            {Array.from({ length: BARS }, (_, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: bar numbers
                key={i}
                className="border-l px-1.5 py-1 font-mono tabular-nums first:border-l-0"
              >
                {i + 1}
              </li>
            ))}
          </ol>

          {CHANNELS.map((channel) => {
            const Icon = ICONS[channel.id];
            const muted = mixer[channel.id].muted;
            return (
              <React.Fragment key={channel.id}>
                <div
                  data-tour={`lane-${channel.id}`}
                  className="sticky left-0 z-10 flex items-center gap-2 border-r border-b bg-background px-2 py-2 text-sm"
                  style={{ '--lane': `var(--chart-${channel.hue})` } as React.CSSProperties}
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--lane)_22%,transparent)] text-foreground">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span
                    className={cn('font-medium', muted && 'text-muted-foreground line-through')}
                  >
                    {channel.label}
                  </span>
                </div>
                <div
                  className="relative grid border-b"
                  style={
                    {
                      gridTemplateColumns: `repeat(${BARS}, 1fr)`,
                      '--lane': `var(--chart-${channel.hue})`,
                    } as React.CSSProperties
                  }
                >
                  {Array.from({ length: BARS }, (_, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: grid lines
                      key={i}
                      aria-hidden="true"
                      className="border-l border-dashed first:border-l-0"
                      style={{ gridColumn: i + 1, gridRow: 1 }}
                    />
                  ))}
                  {clips
                    .filter((clip) => clip.channel === channel.id)
                    .map((clip) => (
                      <div
                        key={clip.id}
                        data-tour={`clip-${clip.id}`}
                        className={cn(
                          'm-1 flex min-w-0 flex-col gap-0.5 overflow-hidden rounded-md bg-[color-mix(in_oklab,var(--lane)_18%,var(--background))] px-1.5 py-1 ring-1 ring-[color-mix(in_oklab,var(--lane)_45%,transparent)] ring-inset',
                          muted && 'opacity-45',
                        )}
                        style={{
                          gridColumn: `${clip.start + 1} / span ${clip.length}`,
                          gridRow: 1,
                        }}
                      >
                        <span className="truncate text-xs font-medium">{clip.name}</span>
                        <Waveform seed={clip.name} bars={clip.length} />
                      </div>
                    ))}
                </div>
              </React.Fragment>
            );
          })}

          {/* Playhead: spans the clip area only. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 left-[6.5rem]"
          >
            <div
              data-tour="playhead"
              className={cn(
                'absolute inset-y-0 w-px bg-foreground',
                !playing && position === 0 && 'opacity-40',
              )}
              style={{ left: `${(position / BARS) * 100}%` }}
            >
              <span className="absolute -top-px -left-[5px] size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
