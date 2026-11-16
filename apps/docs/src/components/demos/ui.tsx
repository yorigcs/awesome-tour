import { Tour } from '@awesome-tour/react';
import {
  BarChart3,
  Bell,
  FolderKanban,
  LayoutDashboard,
  Play,
  Plus,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, current: true },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Team', icon: Users },
  { label: 'Settings', icon: Settings },
];

const STATS = [
  { label: 'Revenue', value: '$48,210', delta: '+12.4%', up: true },
  { label: 'Active users', value: '1,284', delta: '+3.1%', up: true },
  { label: 'Churn', value: '2.1%', delta: '-0.4%', up: false },
];

/** A fake product UI used as the tour's stage. Ids are prefixed so demos can share a page. */
export function MockApp({ id, children }: { id: string; children?: React.ReactNode }) {
  return (
    <AppSurface className="grid min-h-72 gap-3 sm:grid-cols-[11rem_1fr]">
      <nav
        id={`${id}-nav`}
        aria-label={`Demo navigation (${id})`}
        className="flex flex-col gap-0.5 rounded-lg border bg-sidebar p-2 text-sidebar-foreground"
      >
        <span className="mb-2 flex items-center gap-2 px-2 pt-1 font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
            A
          </span>
          Acme
        </span>
        {NAV.map(({ label, icon: Icon, current }) => (
          <span
            key={label}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground',
              current && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </span>
        ))}
      </nav>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id={`${id}-search`} placeholder="Search…" aria-label="Search" className="pl-8" />
          </div>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell />
          </Button>
          <Button id={`${id}-new`} variant="outline">
            <Plus />
            New project
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              id={`${id}-stat-${i + 1}`}
              className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-card-foreground"
            >
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span className="text-xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  stat.up
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400',
                )}
              >
                {stat.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {stat.delta}
              </span>
            </div>
          ))}
        </div>
        {children}
      </div>
    </AppSurface>
  );
}

/** A small labelled tile, for demos that need simple targets. */
export function Tile({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & { label: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border bg-card p-3 text-card-foreground',
        className,
      )}
      {...props}
    >
      <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
