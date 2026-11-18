import { Download, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { unlockAudio } from '../audio';
import { useLoopwork, useLoopworkApp } from '../context';

/** Loopwork's mark: a loop with a playhead notch. Geometry, not a picture. */
export function LoopworkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-6', className)}>
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <circle cx="12" cy="12" r="6" fill="none" strokeWidth="2.5" className="stroke-background" />
      <rect x="11" y="3.5" width="2" height="6" rx="1" className="fill-[var(--chart-1)]" />
    </svg>
  );
}

/** `bar.beat.sixteenth`, 1-based, like every DAW's counter. */
function formatPosition(position: number) {
  const bar = Math.floor(position) + 1;
  const sixteenth = Math.floor((position % 1) * 16);
  const beat = Math.floor(sixteenth / 4) + 1;
  return `${String(bar).padStart(3, '0')}.${beat}.${(sixteenth % 4) + 1}`;
}

export function Transport({ className, sticky = false }: { className?: string; sticky?: boolean }) {
  const { app } = useLoopworkApp();
  const playing = useLoopwork((s) => s.playing);
  const recording = useLoopwork((s) => s.recording);
  const bpm = useLoopwork((s) => s.bpm);
  const position = useLoopwork((s) => s.position);
  const sound = useLoopwork((s) => s.sound);
  const project = useLoopwork((s) => s.project);

  return (
    <header
      data-tour="transport"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/95 px-3 py-2 backdrop-blur-sm',
        sticky && 'sticky top-0 z-10',
        className,
      )}
    >
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <LoopworkMark />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Loopwork</span>
          <span className="truncate text-xs text-muted-foreground @max-lg:hidden">
            {project}.lwp
          </span>
        </div>
      </div>

      <fieldset
        className="flex items-center gap-1 rounded-md border bg-muted/60 p-0.5"
        aria-label="Transport"
      >
        <Button
          data-tour="stop"
          variant="ghost"
          size="icon-sm"
          aria-label="Stop"
          onClick={() => app.stop()}
        >
          <Square className="fill-current" />
        </Button>
        <Button
          data-tour="play"
          variant={playing ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label={playing ? 'Playing' : 'Play'}
          aria-pressed={playing}
          onClick={() => (playing ? app.stop() : app.play())}
        >
          {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Button>
        <Button
          data-tour="record"
          variant="ghost"
          size="icon-sm"
          aria-label="Record"
          aria-pressed={recording}
          onClick={() => app.toggleRecord()}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-3 rounded-full border-2 border-destructive',
              recording && 'bg-destructive motion-safe:animate-pulse',
            )}
          />
        </Button>
      </fieldset>

      <div className="flex items-center gap-2 rounded-md border px-2 py-1">
        <output
          data-tour="timecode"
          aria-label="Playback position"
          className="w-[4.75rem] font-mono text-sm tabular-nums"
        >
          {formatPosition(position)}
        </output>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            data-tour="bpm"
            type="number"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => app.setBpm(Number(e.target.value) || bpm)}
            className="w-10 bg-transparent text-right font-mono text-sm text-foreground tabular-nums outline-none focus-visible:underline [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          BPM
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          data-tour="sound"
          variant="ghost"
          size="icon-sm"
          aria-label={sound ? 'Mute preview audio' : 'Turn preview audio on'}
          aria-pressed={sound}
          onClick={() => {
            if (!sound) unlockAudio();
            app.setSound(!sound);
          }}
        >
          {sound ? <Volume2 /> : <VolumeX />}
        </Button>
        <Button
          data-tour="export"
          size="sm"
          onClick={() => app.navigate('mix')}
          aria-label="Export"
        >
          <Download />
          Export
        </Button>
      </div>
    </header>
  );
}
