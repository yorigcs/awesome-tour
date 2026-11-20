import { Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLoopwork, useLoopworkApp } from '../context';
import type { ExportFormat } from '../store';

const FORMATS: { id: ExportFormat; label: string; detail: string; pro?: boolean }[] = [
  { id: 'wav', label: 'WAV', detail: '24-bit, full quality' },
  { id: 'mp3', label: 'MP3', detail: '320 kbps, to share' },
  { id: 'stems', label: 'Stems', detail: 'One file per channel', pro: true },
];

export function ExportPanel({ className }: { className?: string }) {
  const { app } = useLoopworkApp();
  const project = useLoopwork((s) => s.project);
  const plan = useLoopwork((s) => s.plan);
  const { format, status, progress } = useLoopwork((s) => s.export);

  return (
    <div
      role="group"
      data-tour="export-panel"
      aria-label="Export"
      className={cn('flex min-w-0 flex-col gap-3 p-3', className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Bounce</h2>
        <span className="text-xs text-muted-foreground">8 bars · 0:21</span>
      </div>
      <div
        role="radiogroup"
        aria-label="Format"
        data-tour="format"
        className="grid grid-cols-3 gap-1.5"
        onKeyDown={(event) => {
          const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
          if (!delta) return;
          event.preventDefault();
          const allowed = FORMATS.filter((f) => !f.pro || plan === 'pro');
          const i = allowed.findIndex((f) => f.id === format);
          const next = allowed[(i + delta + allowed.length) % allowed.length]!;
          app.setFormat(next.id);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-tour="format-${next.id}"]`)
            ?.focus();
        }}
      >
        {FORMATS.map((f) => {
          const locked = f.pro && plan !== 'pro';
          const checked = format === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={locked || undefined}
              tabIndex={checked ? 0 : -1}
              data-tour={`format-${f.id}`}
              onClick={() => !locked && app.setFormat(f.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                checked ? 'border-foreground bg-accent' : 'hover:bg-accent',
                locked && 'cursor-not-allowed text-muted-foreground hover:bg-transparent',
              )}
            >
              <span className="flex items-center gap-1 text-sm font-medium">
                {f.label}
                {locked && <Lock aria-label="Pro plan" className="size-3" />}
              </span>
              <span className="text-[0.6875rem] text-muted-foreground">{f.detail}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button
          data-tour="bounce"
          onClick={() => app.bounce()}
          disabled={status === 'bouncing'}
          className="shrink-0"
        >
          {status === 'bouncing' ? 'Bouncing…' : status === 'done' ? 'Bounce again' : 'Bounce'}
        </Button>
        <div className="min-w-0 flex-1" aria-live="polite">
          {status === 'idle' && (
            <span className="text-sm text-muted-foreground">Renders the loop to one file.</span>
          )}
          {status === 'bouncing' && (
            <div
              role="progressbar"
              aria-label="Bouncing"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
          {status === 'done' && (
            <span data-tour="bounce-result" className="flex items-center gap-1.5 text-sm">
              <Check aria-hidden="true" className="size-4 text-[var(--chart-3)]" />
              <span className="truncate font-medium">
                {project}.{format === 'stems' ? 'zip' : format}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
