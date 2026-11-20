import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLoopwork, useLoopworkApp } from '../context';
import { Knob } from './knob';

/**
 * Drum bus effects, in a modal (Radix) dialog: `aria-modal`, its own focus scope, the page
 * behind made unreachable. A tour step targeting the knobs in here has to render inside it.
 */
export function FxDialog({
  container,
}: {
  /** Where to portal (keep it inside the app so its tokens apply). */
  container?: HTMLElement | null;
}) {
  const { app } = useLoopworkApp();
  const fx = useLoopwork((s) => s.fx);
  const open = useLoopwork((s) => s.fxOpen);
  return (
    <Dialog open={open} onOpenChange={(next) => app.setFxOpen(next)}>
      <DialogContent container={container} data-tour="fx-dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Drum bus</DialogTitle>
          <DialogDescription>Effects on every drum hit, before the mixer.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-md border p-3">
            <Knob
              data-tour="fx-drive"
              label="Drive"
              value={fx.drive}
              color="var(--chart-5)"
              onChange={(v) => app.setDrive(v)}
            />
            <span className="text-sm font-medium">Drive</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {Math.round(fx.drive * 100)}%
            </span>
          </div>
          <button
            type="button"
            role="switch"
            data-tour="fx-tape"
            aria-checked={fx.tape}
            onClick={() => app.setTape(!fx.tape)}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-md border p-3 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
              fx.tape &&
                'border-[var(--chart-5)] bg-[color-mix(in_oklab,var(--chart-5)_14%,transparent)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'relative h-5 w-9 rounded-full bg-muted transition-colors',
                fx.tape && 'bg-[var(--chart-5)]',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow-sm transition-transform duration-150',
                  fx.tape && 'translate-x-4',
                )}
              />
            </span>
            <span className="font-medium">Tape saturation</span>
            <span className="text-xs text-muted-foreground">{fx.tape ? 'On' : 'Off'}</span>
          </button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button data-tour="fx-done">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
