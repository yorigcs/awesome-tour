import * as React from 'react';
import { connectAudio } from './audio';
import { createLoopwork, type Loopwork, type LoopworkState } from './store';

interface LoopworkContextValue {
  app: Loopwork;
  scope: string;
}

const LoopworkContext = React.createContext<LoopworkContextValue | null>(null);

export function useLoopworkApp(): LoopworkContextValue {
  const ctx = React.useContext(LoopworkContext);
  if (!ctx) throw new Error('Loopwork parts must be rendered inside <LoopworkApp>');
  return ctx;
}

/** Subscribe to a slice of the Loopwork state. */
export function useLoopwork<T>(selector: (state: LoopworkState) => T): T {
  const { app } = useLoopworkApp();
  return React.useSyncExternalStore(
    app.subscribe,
    () => selector(app.getState()),
    () => selector(app.getState()),
  );
}

/**
 * CSS selector for a part of one Loopwork instance: `part('basic', 'mixer')` →
 * `#basic [data-tour="mixer"]`. Scoped by the app's id, so several demos can share a page.
 */
export function part(scope: string, name: string): string {
  return `#${scope} [data-tour="${name}"]`;
}

/** Bound version of `part` for one scope: `const $ = parts('basic'); $('mixer')`. */
export function parts(scope: string) {
  return (name: string) => part(scope, name);
}

/** Creates a Loopwork instance that lives as long as the component. */
export function useCreateLoopwork(overrides?: Partial<LoopworkState>): Loopwork {
  const [app] = React.useState(() => createLoopwork(overrides));
  React.useEffect(() => connectAudio(app), [app]);
  return app;
}

export function LoopworkProvider({
  app,
  scope,
  children,
}: {
  app: Loopwork;
  scope: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ app, scope }), [app, scope]);
  return <LoopworkContext.Provider value={value}>{children}</LoopworkContext.Provider>;
}
