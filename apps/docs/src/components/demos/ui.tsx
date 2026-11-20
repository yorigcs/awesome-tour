import { Tour } from '@awesome-tour/react';
import { Play } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/** Buttons of the docs' own world (outside the demo app): marker yellow for the action. */
export const worldButton = {
  primary:
    'inline-flex h-9 items-center gap-2 rounded-sm border-2 border-ink bg-marker px-3.5 text-sm font-bold text-marker-ink transition-transform hover:-translate-y-px active:translate-y-0 [&_svg]:size-4',
  secondary:
    'inline-flex h-9 items-center gap-2 rounded-sm border-2 border-ink bg-paper px-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-2 [&_svg]:size-4 aria-pressed:bg-ink aria-pressed:text-paper',
  ghost:
    'inline-flex h-9 items-center gap-2 rounded-sm px-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink [&_svg]:size-4',
};

/**
 * A demo figure: caption bar with actions, "your app" inside, optional notes underneath.
 * `data-demo-frame` is what the e2e/axe checks look for.
 */
export function DemoFrame({
  title,
  actions,
  footer,
  className,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      data-demo-frame=""
      className={cn(
        'not-prose my-0 border-2 border-ink bg-paper text-[0.9375rem] text-ink',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center gap-2 border-b-2 border-ink px-3 py-2">
        <span className="mr-auto flex items-center gap-2 font-bold">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-marker ring-2 ring-ink" />
          {title}
        </span>
        {actions}
      </figcaption>
      <div className="bg-paper-2 p-3 sm:p-5">{children}</div>
      {footer && (
        <div className="border-t-2 border-ink px-3 py-2.5 text-[0.8125rem] text-ink-2">
          {footer}
        </div>
      )}
    </figure>
  );
}

/** "Start tour" — wired to `Tour.Trigger`. */
export function StartButton({
  children = 'Start tour',
  className,
  ...props
}: React.ComponentProps<typeof Tour.Trigger>) {
  return (
    <Tour.Trigger className={cn(worldButton.primary, className)} {...props}>
      <Play aria-hidden="true" />
      {children}
    </Tour.Trigger>
  );
}

/** Wraps demo content in "your app": neutral product tokens, a window with a soft shadow. */
export function AppSurface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-app=""
      className={cn(
        'rounded-lg border bg-background p-3 text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.18)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
