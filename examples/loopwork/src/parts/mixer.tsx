import { SlidersHorizontal } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLoopwork, useLoopworkApp } from '../context';
import { CHANNELS } from '../store';
import { Knob } from './knob';

/** Level meter: follows the channel level, and moves with the beat while playing. */
function Meter({ level, active, step }: { level: number; active: boolean; step: number }) {
  const pulse = active ? (step % 4 === 0 ? 1 : step % 2 === 0 ? 0.82 : 0.68) : 0;
  const fill = Math.min(1, level * pulse);
  return (
    <div aria-hidden="true" className="relative h-16 w-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="absolute inset-x-0 bottom-0 rounded-full bg-[var(--lane)] transition-[height] duration-150 ease-out motion-reduce:transition-none"
        style={{ height: `${fill * 100}%` }}
      />
    </div>
  );
}

export function Mixer({
  className,
  fx = true,
}: {
  className?: string;
  /** Show the "FX" slot on the drums channel (opens the effects dialog). Default: true. */
  fx?: boolean;
}) {
  const { app } = useLoopworkApp();
  const mixer = useLoopwork((s) => s.mixer);
  const playing = useLoopwork((s) => s.playing);
  const step = useLoopwork((s) => s.step);
  const drive = useLoopwork((s) => s.fx.drive);

  return (
    <div
      role="group"
      data-tour="mixer"
      aria-label="Mixer"
      className={cn('flex min-w-0 flex-col gap-2 p-3', className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Mixer</h2>
        <span className="text-xs text-muted-foreground">4 channels</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {CHANNELS.map((channel) => {
          const { level, muted } = mixer[channel.id];
          return (
            <div
              key={channel.id}
              data-tour={`channel-${channel.id}`}
              className="flex min-w-0 flex-col items-center gap-2 rounded-md border bg-card px-1 py-2"
              style={{ '--lane': `var(--chart-${channel.hue})` } as React.CSSProperties}
            >
              <span className="text-xs font-medium">{channel.label}</span>
              <div className="flex items-end gap-1.5">
                <Knob
                  data-tour={`knob-${channel.id}`}
                  label={`${channel.label} level`}
                  value={level}
                  color={`var(--chart-${channel.hue})`}
                  onChange={(v) => app.setLevel(channel.id, v)}
                />
                <Meter level={muted ? 0 : level} active={playing} step={step} />
              </div>
              <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                {Math.round(level * 100)}%
              </span>
              <div className="flex gap-1">
                <Button
                  data-tour={`mute-${channel.id}`}
                  variant={muted ? 'secondary' : 'ghost'}
                  size="icon-xs"
                  aria-pressed={muted}
                  aria-label={`Mute ${channel.label}`}
                  onClick={() => app.toggleMute(channel.id)}
                  className={cn('font-mono text-[0.6875rem]', muted && 'text-foreground')}
                >
                  M
                </Button>
                {fx && channel.id === 'drums' && (
                  <Button
                    data-tour="fx-slot"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Drum effects (drive ${Math.round(drive * 100)}%)`}
                    onClick={() => app.setFxOpen(true)}
                  >
                    <SlidersHorizontal />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
