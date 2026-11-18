import { FolderOpen, LayoutPanelTop, SlidersVertical } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { LoopworkProvider, useCreateLoopwork, useLoopwork, useLoopworkApp } from './context';
import { Arrangement } from './parts/arrangement';
import { SampleBrowser } from './parts/browser';
import { ExportPanel } from './parts/export-panel';
import { FxDialog } from './parts/fx-dialog';
import { Mixer } from './parts/mixer';
import { Sequencer } from './parts/sequencer';
import { Transport } from './parts/transport';
import type { Loopwork, LoopworkState, Route } from './store';

export interface LoopworkAppProps extends Omit<React.ComponentProps<'div'>, 'id'> {
  /** The app's DOM id: tours target its parts with `part(scope, name)`. */
  scope: string;
  /** An app made with `createLoopwork()` (or `useCreateLoopwork()`); one is created otherwise. */
  app?: Loopwork;
  /** Initial state when the app is created here. */
  initial?: Partial<LoopworkState>;
  /**
   * `studio` (default): every panel at once. `compact`: transport, sequencer and mixer.
   * `routed`: one page at a time (Arrange, Mix, Library) with tabs, for multi-page tours.
   * `custom`: compose the parts yourself as children.
   */
  layout?: 'studio' | 'compact' | 'routed' | 'custom';
  /** Make the transport sticky inside a scrolling app (`maxHeight`). */
  maxHeight?: number | string;
}

/**
 * Loopwork, the fictional beat-maker every awesome-tour demo runs on. Renders as "your app"
 * (`data-app`): it only uses shadcn tokens, like the product you'd add a tour to.
 */
export function LoopworkApp({
  scope,
  app: appProp,
  initial,
  layout = 'studio',
  maxHeight,
  className,
  children,
  style,
  ...props
}: LoopworkAppProps) {
  const own = useCreateLoopwork(initial);
  const app = appProp ?? own;
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null);

  return (
    <LoopworkProvider app={app} scope={scope}>
      <div
        {...props}
        id={scope}
        ref={setRoot}
        data-app=""
        className={cn(
          '@container relative isolate flex flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-16px_rgb(0_0_0/0.25)]',
          maxHeight != null && 'overflow-y-auto',
          className,
        )}
        style={{ ...style, ...(maxHeight != null ? { maxHeight } : {}) }}
      >
        {layout === 'custom' ? (
          children
        ) : (
          <>
            <Transport sticky={maxHeight != null} />
            {layout === 'routed' ? (
              <RoutedBody />
            ) : layout === 'compact' ? (
              <CompactBody />
            ) : (
              <StudioBody />
            )}
            {children}
          </>
        )}
        <FxDialog container={root} />
      </div>
    </LoopworkProvider>
  );
}

function StudioBody() {
  return (
    <div className="grid min-h-0 @5xl:grid-cols-[13.5rem_minmax(0,1fr)]">
      <SampleBrowser className="hidden border-r bg-sidebar @5xl:flex" height={300} />
      <div className="flex min-w-0 flex-col">
        <Arrangement className="border-b" />
        <div className="grid min-w-0 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Sequencer className="border-b @3xl:border-r @3xl:border-b-0" />
          <Mixer />
        </div>
      </div>
    </div>
  );
}

function CompactBody() {
  return (
    <div className="grid min-w-0 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Sequencer className="border-b @3xl:border-r @3xl:border-b-0" />
      <Mixer />
    </div>
  );
}

const ROUTES: { id: Route; label: string; icon: typeof FolderOpen }[] = [
  { id: 'arrange', label: 'Arrange', icon: LayoutPanelTop },
  { id: 'mix', label: 'Mix', icon: SlidersVertical },
  { id: 'library', label: 'Library', icon: FolderOpen },
];

/** Page switcher for the routed layout. Links in spirit: `aria-current` marks the page. */
export function RouteNav({ className }: { className?: string }) {
  const { app } = useLoopworkApp();
  const route = useLoopwork((s) => s.route);
  return (
    <nav
      aria-label="Loopwork pages"
      data-tour="pages"
      className={cn('flex gap-1 border-b px-2 py-1.5', className)}
    >
      {ROUTES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          data-tour={`page-${id}`}
          aria-current={route === id ? 'page' : undefined}
          onClick={() => app.navigate(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            route === id && 'bg-accent font-medium text-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function RoutedBody() {
  const route = useLoopwork((s) => s.route);
  return (
    <>
      <RouteNav />
      <div className="min-h-[17rem]">
        {route === 'arrange' && (
          <>
            <Arrangement className="border-b" />
            <Sequencer />
          </>
        )}
        {route === 'mix' && (
          <div className="grid @2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Mixer className="border-b @2xl:border-r @2xl:border-b-0" />
            <ExportPanel />
          </div>
        )}
        {route === 'library' && <SampleBrowser height={260} />}
      </div>
    </>
  );
}
