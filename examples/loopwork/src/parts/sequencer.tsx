import * as React from 'react';
import { cn } from '@/lib/utils';
import { useLoopwork, useLoopworkApp } from '../context';
import { DRUM_ROWS, STEPS } from '../store';

/**
 * The 16-step drum grid. An ARIA grid: one tab stop, arrow keys move between cells (Home/End to
 * the row's ends), Space/Enter toggles. Arrow keys here belong to the grid, not to a tour.
 */
export function Sequencer({ className }: { className?: string }) {
  const { app } = useLoopworkApp();
  const pattern = useLoopwork((s) => s.pattern);
  const step = useLoopwork((s) => s.step);
  const playing = useLoopwork((s) => s.playing);
  const [focus, setFocus] = React.useState({ row: 0, col: 0 });
  const grid = React.useRef<HTMLDivElement>(null);

  const move = (row: number, col: number) => {
    const next = {
      row: (row + DRUM_ROWS.length) % DRUM_ROWS.length,
      col: Math.min(STEPS - 1, Math.max(0, col)),
    };
    setFocus(next);
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${next.row}:${next.col}"]`)
      ?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, row: number, col: number) => {
    const target = {
      ArrowRight: [row, col + 1],
      ArrowLeft: [row, col - 1],
      ArrowDown: [row + 1, col],
      ArrowUp: [row - 1, col],
      Home: [row, 0],
      End: [row, STEPS - 1],
    }[event.key];
    if (!target) return;
    event.preventDefault();
    move(target[0]!, target[1]!);
  };

  return (
    <div
      role="group"
      data-tour="sequencer"
      aria-label="Step sequencer"
      className={cn('flex min-w-0 flex-col gap-2 p-3', className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Beat A</h2>
        <span className="text-xs text-muted-foreground">16 steps · drums</span>
      </div>
      <div
        ref={grid}
        role="grid"
        aria-label="Drum pattern"
        aria-rowcount={DRUM_ROWS.length}
        aria-colcount={STEPS + 1}
        className="flex flex-col gap-1 overflow-x-auto"
      >
        {DRUM_ROWS.map((drum, row) => (
          // biome-ignore lint/a11y/useFocusableInteractive: ARIA grid with roving focus: the cells' buttons take focus
          <div
            key={drum.id}
            role="row"
            data-tour={`row-${drum.id}`}
            className="grid min-w-[20rem] grid-cols-[2.75rem_repeat(16,minmax(0,1fr))] items-center gap-[3px]"
          >
            {/* biome-ignore lint/a11y/useFocusableInteractive: header cells aren't interactive */}
            <span role="rowheader" className="text-xs font-medium text-muted-foreground">
              {drum.label}
            </span>
            {pattern[drum.id].map((on, col) => {
              const current = playing && step === col;
              const downbeat = col % 4 === 0;
              return (
                // biome-ignore lint/a11y/useFocusableInteractive: focus goes to the button inside
                // biome-ignore lint/suspicious/noArrayIndexKey: 16 fixed steps, never reordered
                <div role="gridcell" key={col}>
                  <button
                    type="button"
                    data-cell={`${row}:${col}`}
                    data-tour={`cell-${drum.id}-${col + 1}`}
                    tabIndex={focus.row === row && focus.col === col ? 0 : -1}
                    aria-pressed={on}
                    aria-label={`${drum.label}, step ${col + 1}`}
                    onClick={() => {
                      setFocus({ row, col });
                      app.toggleStep(drum.id, col);
                    }}
                    onKeyDown={(e) => onKeyDown(e, row, col)}
                    className={cn(
                      'block aspect-square w-full rounded-[4px] border outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                      downbeat ? 'bg-muted' : 'bg-background',
                      on && 'border-transparent bg-[var(--chart-1)] hover:bg-[var(--chart-1)]',
                      !on && 'hover:bg-accent',
                      current && 'ring-2 ring-foreground/70',
                    )}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
