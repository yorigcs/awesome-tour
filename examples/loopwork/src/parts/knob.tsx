import * as React from 'react';
import { cn } from '@/lib/utils';

const START = 135; // degrees, clockwise from 3 o'clock
const SWEEP = 270;

function polar(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  // Rounded: server and browser trig can differ in the last digits (hydration mismatch).
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { x: round(20 + r * Math.cos(rad)), y: round(20 + r * Math.sin(rad)) };
}

function arc(from: number, to: number, r: number) {
  const a = polar(from, r);
  const b = polar(to, r);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

export interface KnobProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  /** 0–1. */
  value: number;
  onChange: (value: number) => void;
  label: string;
  /** CSS color for the value arc. */
  color?: string;
  size?: 'sm' | 'md';
}

/**
 * A rotary control: `role="slider"`, arrows ±1% (Shift ±10%), Page Up/Down ±10%, Home/End,
 * vertical drag with the pointer.
 */
export const Knob = React.forwardRef<HTMLDivElement, KnobProps>(function Knob(
  { value, onChange, label, color = 'var(--foreground)', size = 'md', className, ...props },
  ref,
) {
  const percent = Math.round(value * 100);
  const drag = React.useRef<{ y: number; value: number } | null>(null);
  const set = (next: number) => onChange(Math.min(1, Math.max(0, Math.round(next * 100) / 100)));

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const actions: Record<string, number> = {
      ArrowUp: value + step,
      ArrowRight: value + step,
      ArrowDown: value - step,
      ArrowLeft: value - step,
      PageUp: value + 0.1,
      PageDown: value - 0.1,
      Home: 0,
      End: 1,
    };
    const next = actions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    set(next);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        drag.current = { y: event.clientY, value };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        set(drag.current.value + (drag.current.y - event.clientY) / 150);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      className={cn(
        'relative cursor-ns-resize touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        size === 'md' ? 'size-11' : 'size-8',
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" className="size-full">
        <path
          d={arc(START, START + SWEEP, 16)}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="stroke-muted"
        />
        {percent > 0 && (
          <path
            d={arc(START, START + SWEEP * value, 16)}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ stroke: color }}
          />
        )}
        <circle cx="20" cy="20" r="10" className="fill-card stroke-border" strokeWidth="1" />
        {(() => {
          const tip = polar(START + SWEEP * value, 8);
          const base = polar(START + SWEEP * value, 3);
          return (
            <line
              x1={base.x}
              y1={base.y}
              x2={tip.x}
              y2={tip.y}
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-foreground"
            />
          );
        })()}
      </svg>
    </div>
  );
});
