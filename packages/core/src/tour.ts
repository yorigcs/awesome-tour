import { defaultAnchors } from './anchors';
import { checkTour, warn } from './diagnostics';
import {
  isElement,
  isTargetConnected,
  scrollTargetsIntoView,
  subscribeDomActivity,
  subscribeTicker,
} from './dom';
import { createEmitter } from './emitter';
import { matchRoute } from './router';
import { createStore } from './store';
import { resolveTarget, waitForTarget } from './targets';
import type {
  AdvanceOn,
  CheckedStep,
  RouterAdapter,
  StartOptions,
  StepContext,
  StepDefinition,
  Tour,
  TourDirection,
  TourEvents,
  TourOptions,
  TourPlugin,
  TourProgress,
  TourState,
  TourStatus,
  TourTargetNode,
} from './types';

const DEFAULT_TIMEOUT = 3000;
const MAX_TIMEOUT = 2 ** 31 - 1;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
}

function toArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}

const defaultMatch = matchRoute;

/** `/projects/:id` or `/docs/*` can be matched but not navigated to. */
function isRoutePattern(route: string) {
  return /(^|\/)(:|\*)/.test(route);
}

/**
 * Create a headless tour. Framework agnostic: drive it imperatively, or bind it to UI through
 * `subscribe`/`getState` (e.g. React's `useSyncExternalStore`).
 */
export function createTour<
  const TStep extends StepDefinition<TData, string>,
  TData = Record<string, unknown>,
>(
  options: TourOptions<TStep, TData> & { steps: readonly CheckedStep<TStep, TStep['id']>[] },
): Tour<TStep, TData> {
  type TId = TStep['id'];
  type State = TourState<TId, TData>;

  checkTour(options as TourOptions<StepDefinition<any, string>, any>);
  const anchors = options.anchors ?? defaultAnchors;
  /** Live plugin list: `tour.use()` adds to it (iterate over copies — it can change mid-await). */
  const plugins: TourPlugin<any, TData>[] = [...(options.plugins ?? [])];
  let steps: readonly TStep[] = options.steps;
  let router: RouterAdapter | undefined = options.router;

  const store = createStore<State>({
    status: 'idle',
    phase: null,
    stepId: null,
    stepIndex: -1,
    direction: null,
    history: [],
    targets: [],
    targetMissing: false,
    progress: { current: 0, total: steps.length },
    data: (options.data ?? {}) as TData,
    error: null,
    canNext: true,
  });

  const emitter = createEmitter<TourEvents<TId, TData>>((error) => {
    console.error('[awesome-tour] event handler threw', error);
  });

  /** Controls the in-flight transition. Aborted when superseded. */
  let transitionController: AbortController | null = null;
  /** Controls listeners that live while a step is shown (advanceOn). */
  let stepController: AbortController | null = null;
  const signalHandlers = new Map<string, Set<() => void>>();
  /** Set by `start()`: emit `start` right before the first `stepChange` of the run. */
  let pendingStart = false;
  const cleanups: (() => void)[] = [];
  /** The step whose leave hooks haven't run yet (each entered step is left exactly once). */
  let entered: TStep | null = null;
  /** Lives as long as the tour: aborted by `destroy()` (signal given to `afterLeave`). */
  const life = new AbortController();
  /** Guards `next()`/`prev()` against re-entry (double clicks, advanceOn racing a click). */
  let navigating = false;
  /** Bumped whenever `when` results may change (data, steps, new run): invalidates caches. */
  let visibilityVersion = 0;
  let visibilityController = new AbortController();
  /** Steps whose `when` returned a promise, with the version it was last evaluated at. */
  const asyncEvaluatedAt = new Map<TId, number>();

  /* ---------------------------------------------------------------------------------------------
   * Helpers
   * -------------------------------------------------------------------------------------------*/

  const getState = store.getState;
  const getStep = (id: TId | null | undefined) =>
    id == null ? undefined : steps.find((s) => s.id === id);
  const indexOf = (id: TId | null) => (id == null ? -1 : steps.findIndex((s) => s.id === id));

  const context = (step: TStep, signal: AbortSignal): StepContext<TData, TId> => ({
    tour: tour as unknown as Tour<StepDefinition<TData, TId>, TData>,
    step: step as unknown as StepDefinition<TData, TId>,
    data: getState().data,
    signal,
  });

  const reportError = (error: unknown) => {
    store.setState({ error });
    if (!emitter.has('error')) {
      warn(
        'AT005',
        `tour "${options.id}" failed and nothing listens to its \`error\` event.`,
        error,
      );
    }
    emitter.emit('error', { error, stepId: getState().stepId });
  };

  /** Last settled result of each async `when`, so progress counts can use it synchronously. */
  const asyncVisibility = new Map<TId, boolean>();

  async function isVisible(step: TStep, signal: AbortSignal): Promise<boolean> {
    if (!step.when) return true;
    try {
      const visible = Boolean(await step.when(context(step, signal)));
      asyncVisibility.set(step.id, visible);
      return visible;
    } catch (error) {
      reportError(error);
      return false;
    }
  }

  /** Recompute `progress` after an async `when` settles differently than assumed. */
  function refreshProgress() {
    const { stepId, progress } = getState();
    if (stepId == null) return;
    const next = computeProgress(stepId);
    if (next.current !== progress.current || next.total !== progress.total) {
      store.setState({ progress: next });
    }
  }

  /**
   * Steps whose `when` currently passes. An async `when` counts with its last settled result
   * (visible until it first settles); when it settles differently, `progress` is updated.
   */
  function invalidateVisibility() {
    visibilityVersion++;
    visibilityController.abort();
    visibilityController = new AbortController();
  }

  function getVisibleSteps(): TStep[] {
    const { signal } = visibilityController;
    const version = visibilityVersion;
    return steps.filter((step) => {
      if (!step.when) return true;
      // Async conditions run once per version: progress/indicators call this on every render.
      if (asyncEvaluatedAt.get(step.id) === version) return asyncVisibility.get(step.id) ?? true;
      try {
        const result = step.when(context(step, signal));
        if (!(result instanceof Promise)) return Boolean(result);
        asyncEvaluatedAt.set(step.id, version);
        result.then(
          (value) => {
            if (signal.aborted) return;
            const visible = Boolean(value);
            if (asyncVisibility.get(step.id) === visible) return;
            asyncVisibility.set(step.id, visible);
            refreshProgress();
          },
          () => {},
        );
        return asyncVisibility.get(step.id) ?? true;
      } catch {
        return false;
      }
    });
  }

  function computeProgress(stepId: TId | null): TourProgress {
    const visible = getVisibleSteps();
    const index = visible.findIndex((s) => s.id === stepId);
    return { current: index + 1, total: visible.length };
  }

  async function findSequential(fromIndex: number, dir: 1 | -1, signal: AbortSignal) {
    for (let i = fromIndex + dir; i >= 0 && i < steps.length; i += dir) {
      const step = steps[i]!;
      if (await isVisible(step, signal)) return step.id;
      if (signal.aborted) return null;
    }
    return null;
  }

  /** Resolve the step after `step`, honoring branching (`next`) and conditions (`when`). */
  async function resolveForward(step: TStep, signal: AbortSignal, seen = new Set<TId>()) {
    seen.add(step.id);
    if (step.next !== undefined) {
      const explicit =
        typeof step.next === 'function' ? step.next(context(step, signal)) : step.next;
      if (explicit === null) return null;
      if (explicit !== undefined) {
        const target = getStep(explicit as TId);
        if (!target)
          throw new Error(`[awesome-tour] Unknown step "${explicit}" in tour "${options.id}"`);
        if (await isVisible(target, signal)) return target.id;
        if (seen.has(target.id)) return null;
        return resolveForward(target, signal, seen);
      }
    }
    return findSequential(indexOf(step.id), 1, signal);
  }

  /** Stops the shown step's listeners (advanceOn, canNext) without running its leave hooks. */
  function deactivate() {
    stepController?.abort();
    stepController = null;
  }

  /** Runs the entered step's leave hooks (`stepLeave`, `afterLeave`), at most once per entry. */
  function leaveCurrent() {
    deactivate();
    const step = entered;
    if (!step) return;
    entered = null;
    emitter.emit('stepLeave', { stepId: step.id });
    if (step.afterLeave) {
      Promise.resolve()
        .then(() => step.afterLeave!(context(step, life.signal)))
        .catch(reportError);
    }
  }

  /** A transition failed after leaving `step`: put it back on screen, listeners included. */
  function restore(step: TStep | undefined) {
    if (!step || getState().status !== 'active' || getState().stepId !== step.id) {
      store.setState({ phase: getState().stepId ? 'ready' : null });
      return;
    }
    entered = step;
    const signal = new AbortController().signal;
    store.setState({ phase: 'ready', canNext: evaluateCanNext(step, signal) });
    setupAdvance(step);
  }

  /** `beforeEnter` with the step's (or tour's) `enterTimeout`. */
  async function runBeforeEnter(step: TStep, signal: AbortSignal) {
    const timeout = step.enterTimeout ?? options.enterTimeout;
    const run = Promise.resolve(step.beforeEnter!(context(step, signal)));
    if (timeout == null) return run;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `[awesome-tour] beforeEnter of step "${step.id}" did not settle within ${timeout}ms`,
            ),
          ),
        timeout,
      );
    });
    try {
      return await Promise.race([run, expired]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Runs the current step's `beforeLeave` guard. False keeps the user on the step. */
  async function mayLeave(to: TId | null, direction: TourDirection, signal: AbortSignal) {
    const { stepId, status } = getState();
    const step = getStep(stepId);
    if (status !== 'active' || !step?.beforeLeave || stepId === to) return true;
    try {
      return (await step.beforeLeave(context(step, signal), { to, direction })) !== false;
    } catch (error) {
      reportError(error);
      return false;
    }
  }

  function routeMatches(route: string) {
    if (!router) return true;
    return (router.match ?? defaultMatch)(route, router.getPath());
  }

  /** Resolves when the router reaches `route` (or rejects on abort). */
  function waitForRoute(route: string, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      let unsubscribe: (() => void) | undefined;
      let timer: ReturnType<typeof setInterval> | undefined;
      const cleanup = () => {
        unsubscribe?.();
        if (timer) clearInterval(timer);
        signal.removeEventListener('abort', onAbort);
      };
      const check = () => {
        if (!routeMatches(route)) return;
        cleanup();
        resolve();
      };
      const onAbort = () => {
        cleanup();
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort);
      if (router?.subscribe) unsubscribe = router.subscribe(check);
      else timer = setInterval(check, 100); // adapters without `subscribe`: poll the path
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * Transition pipeline
   * -------------------------------------------------------------------------------------------*/

  async function transition(requested: TId, direction: TourDirection): Promise<boolean> {
    transitionController?.abort();
    const controller = new AbortController();
    transitionController = controller;
    const { signal } = controller;
    const from = getState().stepId;
    const fromStep = entered ?? undefined;
    let to = requested;
    let left = false;

    try {
      for (const plugin of [...plugins]) {
        if (!plugin.beforeStep) continue;
        const result = await plugin.beforeStep(tour, { from, to, direction, signal });
        if (signal.aborted) return false;
        if (result === false) return false;
        if (typeof result === 'string') to = result as TId;
      }

      if (!getStep(to))
        throw new Error(`[awesome-tour] Unknown step "${to}" in tour "${options.id}"`);
      if (!(await mayLeave(to, direction, signal)) || signal.aborted) return false;

      // Previous step's listeners stop and its leave hooks run once, even if `skip` hops further.
      left = true;
      leaveCurrent();
      store.setState({ phase: 'transitioning', direction });

      const visited = new Set<TId>();
      for (;;) {
        const step = getStep(to);
        if (!step) throw new Error(`[awesome-tour] Unknown step "${to}" in tour "${options.id}"`);
        visited.add(step.id);

        if (step.route && router && !routeMatches(step.route)) {
          if (!isRoutePattern(step.route)) {
            await router.navigate(step.route);
            if (signal.aborted) return false;
          }
          // Navigation may not have landed (blocked, redirected, timed out) and patterns can't be
          // navigated to: never resolve targets on the wrong page — hide the step until it's there.
          if (!routeMatches(step.route)) {
            store.setState({ phase: 'resolving' });
            await waitForRoute(step.route, signal);
            if (signal.aborted) return false;
          }
        }

        if (step.beforeEnter) {
          await runBeforeEnter(step, signal);
          if (signal.aborted) return false;
        }

        let targets: TourTargetNode[] = [];
        let targetMissing = false;
        if (step.target != null) {
          const policy = step.onTargetMissing ?? options.onTargetMissing ?? 'center';
          targets = resolveTarget(step.target, anchors);
          if (targets.length === 0) {
            store.setState({ phase: 'resolving' });
            const timeout =
              policy === 'wait'
                ? MAX_TIMEOUT
                : (step.targetTimeout ?? options.targetTimeout ?? DEFAULT_TIMEOUT);
            targets = await waitForTarget(step.target, { anchors, timeout, signal });
            if (signal.aborted) return false;
          }
          if (targets.length === 0) {
            emitter.emit('targetMissing', { stepId: step.id });
            if (policy === 'skip') {
              const nextId =
                direction === 'backward'
                  ? await findSequential(indexOf(step.id), -1, signal)
                  : await resolveForward(step, signal);
              if (signal.aborted) return false;
              if (nextId == null || visited.has(nextId)) {
                if (direction === 'backward') {
                  restore(fromStep);
                  return false;
                }
                finish('completed');
                return false;
              }
              to = nextId;
              continue;
            }
            if (policy === 'error') {
              throw new Error(`[awesome-tour] Target for step "${step.id}" not found`);
            }
            targetMissing = true;
          }
        }

        // Commit: the step becomes current. Content can render and follow the target while it
        // scrolls into view.
        const base = getState().history;
        const existing = base.lastIndexOf(step.id);
        const history = existing >= 0 ? base.slice(0, existing + 1) : [...base, step.id];
        entered = step;
        store.setState({
          status: 'active',
          stepId: step.id,
          stepIndex: indexOf(step.id),
          targets,
          targetMissing,
          history,
          direction,
          progress: computeProgress(step.id),
          error: null,
          canNext: evaluateCanNext(step, signal),
        });
        if (pendingStart) {
          pendingStart = false;
          armGoal();
          emitter.emit('start', { stepId: step.id });
        }
        emitter.emit('stepChange', { from, to: step.id, direction });
        // The new step is current: further next()/prev() calls act on it, even while it scrolls
        // into view (smooth scrolling can take a while; a click on "Next" must not be dropped).
        navigating = false;

        const scroll = step.scroll ?? options.scroll ?? true;
        if (scroll && targets.length > 0) {
          const { offset, ...scrollOptions } = typeof scroll === 'object' ? scroll : {};
          await scrollTargetsIntoView(targets, scrollOptions, undefined, offset);
          if (signal.aborted) return true;
        }

        store.setState({ phase: 'ready' });
        setupAdvance(step);
        return true;
      }
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return false;
      if (transitionController === controller) transitionController = null;
      if (left) restore(fromStep);
      else store.setState({ phase: getState().stepId ? 'ready' : null });
      reportError(error);
      return false;
    } finally {
      // Cancelled/redirected transitions must not leave a stale controller behind: route changes
      // are ignored while one is in flight.
      if (transitionController === controller) transitionController = null;
    }
  }

  function evaluateCanNext(step: TStep, signal: AbortSignal): boolean {
    if (!step.canNext) return true;
    try {
      return step.canNext(context(step, signal)) !== false;
    } catch (error) {
      reportError(error);
      return false;
    }
  }

  /**
   * Re-runs `check` on DOM activity (shared observer), state changes and a shared 250ms tick
   * until `signal` aborts.
   */
  function watch(check: () => void, signal: AbortSignal) {
    const offs = [subscribeDomActivity(check), subscribeTicker(250, check), store.subscribe(check)];
    signal.addEventListener('abort', () => {
      for (const off of offs) off();
    });
    queueMicrotask(check);
  }

  /**
   * Notices when the shown step's targets leave the page (an unmounted or re-rendered element)
   * and applies `onTargetLost`.
   */
  function watchTargets(step: TStep, signal: AbortSignal) {
    if (step.target == null) return;
    let recovering = false;
    const check = async () => {
      if (signal.aborted || recovering || getState().stepId !== step.id) return;
      const { targets } = getState();
      if (targets.length === 0 || targets.every(isTargetConnected)) return;
      // Re-rendered elsewhere? Pick up the new nodes silently.
      const again = resolveTarget(step.target, anchors);
      if (again.length > 0) {
        store.setState({ targets: again, targetMissing: false });
        emitter.emit('targetLost', { stepId: step.id, recovered: true });
        return;
      }
      const policy = step.onTargetLost ?? options.onTargetLost ?? 'reresolve';
      if (policy === 'close') {
        emitter.emit('targetLost', { stepId: step.id, recovered: false });
        finish('closed');
        return;
      }
      if (policy === 'reresolve') {
        recovering = true;
        store.setState({ phase: 'resolving' });
        try {
          const found = await waitForTarget(step.target!, {
            anchors,
            timeout: step.targetTimeout ?? options.targetTimeout ?? DEFAULT_TIMEOUT,
            signal,
          });
          if (signal.aborted || getState().stepId !== step.id) return;
          if (found.length > 0) {
            store.setState({ targets: found, targetMissing: false, phase: 'ready' });
            emitter.emit('targetLost', { stepId: step.id, recovered: true });
            return;
          }
        } catch (error) {
          if (signal.aborted || isAbortError(error)) return;
          throw error;
        } finally {
          recovering = false;
        }
      }
      store.setState({ targets: [], targetMissing: true, phase: 'ready' });
      emitter.emit('targetLost', { stepId: step.id, recovered: false });
    };
    const run = () => {
      check().catch(reportError);
    };
    const offs = [subscribeDomActivity(run), anchors.subscribe(run)];
    signal.addEventListener('abort', () => {
      for (const off of offs) off();
    });
  }

  function setupAdvance(step: TStep) {
    const rules = toArray(
      step.advanceOn as AdvanceOn<TData, TId> | readonly AdvanceOn<TData, TId>[],
    );
    const controller = new AbortController();
    stepController = controller;
    const { signal } = controller;
    watchTargets(step, signal);

    if (step.canNext) {
      watch(() => {
        if (signal.aborted || getState().stepId !== step.id) return;
        const canNext = evaluateCanNext(step, signal);
        if (canNext !== getState().canNext) store.setState({ canNext });
      }, signal);
    }

    for (const rule of rules) {
      let fired = false;
      const advance = () => {
        if (fired || signal.aborted || getState().stepId !== step.id) return;
        fired = true;
        if (rule.to) void goTo(rule.to);
        else void next();
      };

      if (rule.event && typeof document !== 'undefined') {
        const nodesOf = () =>
          rule.target ? resolveTarget(rule.target, anchors) : getState().targets;
        const listener = (event: Event) => {
          const path = event.composedPath();
          const hit = nodesOf().some((node) => {
            // Virtual targets standing for an element in an iframe match through that element.
            const el = isElement(node) ? node : node.element;
            return !!el && (path.includes(el) || el.contains(event.target as Node));
          });
          if (hit) advance();
        };
        const documents = new Set<Document>([document]);
        for (const node of nodesOf()) {
          const doc = !isElement(node) ? node.element?.ownerDocument : undefined;
          if (doc) documents.add(doc);
        }
        for (const doc of documents) {
          // No `signal` option: an AbortSignal from this realm isn't accepted by a frame's document.
          doc.addEventListener(rule.event, listener, true);
          signal.addEventListener('abort', () =>
            doc.removeEventListener(rule.event!, listener, true),
          );
        }
      }

      if (rule.when) {
        watch(() => {
          try {
            if (rule.when!(context(step, signal))) advance();
          } catch (error) {
            reportError(error);
          }
        }, signal);
      }

      if (rule.delay != null) {
        const timer = setTimeout(advance, rule.delay);
        signal.addEventListener('abort', () => clearTimeout(timer));
      }

      if (rule.signal) {
        const name = rule.signal;
        let set = signalHandlers.get(name);
        if (!set) {
          set = new Set();
          signalHandlers.set(name, set);
        }
        set.add(advance);
        signal.addEventListener('abort', () => set.delete(advance));
      }
    }
  }

  function finish(status: Extract<TourStatus, 'completed' | 'skipped' | 'closed' | 'paused'>) {
    transitionController?.abort();
    transitionController = null;
    leaveCurrent();
    const { stepId } = getState();
    store.setState({ status, phase: null, targets: [], targetMissing: false });
    const event = (
      { completed: 'complete', skipped: 'skip', closed: 'close', paused: 'pause' } as const
    )[status];
    emitter.emit(event, { stepId });
  }

  /* ---------------------------------------------------------------------------------------------
   * Goal (conversion) tracking
   * -------------------------------------------------------------------------------------------*/

  let goalController: AbortController | null = null;
  const goalSignals = new Set<string>();

  /** Arms the goal for a new run: it outlives the tour until reached or `within` expires. */
  function armGoal(startedAt = Date.now()) {
    const goal = options.goal;
    goalController?.abort();
    goalSignals.clear();
    if (!goal) return;
    if (goal.within != null && Date.now() - startedAt >= goal.within) return;
    const controller = new AbortController();
    goalController = controller;
    const { signal } = controller;
    const reach = () => {
      if (signal.aborted) return;
      controller.abort();
      const { stepId, status } = getState();
      emitter.emit('goal', {
        name: goal.name ?? options.id,
        stepId: status === 'active' || status === 'paused' ? stepId : null,
        status,
        afterMs: Date.now() - startedAt,
      });
    };
    if (goal.within != null) {
      const timer = setTimeout(() => controller.abort(), goal.within - (Date.now() - startedAt));
      signal.addEventListener('abort', () => clearTimeout(timer));
    }
    if (goal.signal) goalSignals.add(goal.signal);
    if (goal.event && typeof document !== 'undefined') {
      const { type, target } = goal.event;
      const listener = (event: Event) => {
        if (!target) return reach();
        const path = event.composedPath();
        if (resolveTarget(target, anchors).some((n) => isElement(n) && path.includes(n))) reach();
      };
      document.addEventListener(type, listener, true);
      signal.addEventListener('abort', () => document.removeEventListener(type, listener, true));
    }
    if (goal.route) {
      const route = goal.route;
      const check = () => {
        if (router && (router.match ?? defaultMatch)(route, router.getPath())) reach();
      };
      const off = router?.subscribe?.(check);
      if (off) signal.addEventListener('abort', off);
      queueMicrotask(check);
    }
    if (goal.when) {
      const predicate = goal.when;
      watch(() => {
        try {
          if (predicate({ data: getState().data })) reach();
        } catch (error) {
          reportError(error);
        }
      }, signal);
    }
    goalReach = reach;
  }
  let goalReach: (() => void) | null = null;

  /* ---------------------------------------------------------------------------------------------
   * Public API
   * -------------------------------------------------------------------------------------------*/

  async function start(startOptions: StartOptions<TId, TData> = {}) {
    const current = getState();
    if (!startOptions.force && (current.status === 'active' || current.status === 'starting'))
      return;

    transitionController?.abort();
    leaveCurrent();
    invalidateVisibility();
    const previousStatus = current.status;
    store.setState({
      status: 'starting',
      phase: null,
      history: [],
      targets: [],
      targetMissing: false,
      error: null,
      data: startOptions.data ? { ...current.data, ...startOptions.data } : current.data,
    });

    const controller = new AbortController();
    transitionController = controller;
    pendingStart = true;
    if (!router) {
      const routed = steps.find((s) => s.route);
      if (routed) {
        warn(
          'AT006',
          `step "${routed.id}" of tour "${options.id}" has a route, but the tour has no router: it won't navigate.`,
        );
      }
    }
    let stepId = startOptions.stepId;
    try {
      for (const plugin of [...plugins]) {
        if (!plugin.beforeStart) continue;
        const result = await plugin.beforeStart(tour, startOptions);
        if (getState().status !== 'starting' || controller.signal.aborted) return;
        if (result === false) {
          store.setState({ status: previousStatus === 'starting' ? 'idle' : previousStatus });
          return;
        }
        if (result) {
          if (stepId === undefined && result.stepId !== undefined) stepId = result.stepId as TId;
          if (result.data) store.setState((s) => ({ data: { ...s.data, ...result.data } }));
        }
      }

      if (stepId !== undefined && !getStep(stepId)) stepId = undefined;
      const first = stepId ?? (await findSequential(-1, 1, controller.signal));
      if (getState().status !== 'starting') return;
      if (first == null) {
        finish('completed');
        return;
      }
      const ok = await transition(first, 'forward');
      if (!ok && getState().status === 'starting') {
        pendingStart = false;
        store.setState({ status: 'idle', phase: null });
      }
    } catch (error) {
      if (isAbortError(error)) return;
      pendingStart = false;
      store.setState({ status: 'idle', phase: null });
      reportError(error);
    }
  }

  async function next() {
    const state = getState();
    if (state.status !== 'active' || navigating) return;
    const step = getStep(state.stepId);
    if (!step || !state.canNext) return;
    const signal = new AbortController().signal;
    navigating = true;
    try {
      const nextId = await resolveForward(step, signal);
      if (getState().stepId !== step.id || getState().status !== 'active') return;
      if (nextId == null) {
        if (await mayLeave(null, 'forward', signal)) finish('completed');
      } else await transition(nextId, 'forward');
    } catch (error) {
      reportError(error);
    } finally {
      navigating = false;
    }
  }

  async function prev() {
    const state = getState();
    if (state.status !== 'active' || navigating) return;
    const signal = new AbortController().signal;
    navigating = true;
    try {
      let target: TId | null = null;
      // Walk back through history, skipping steps whose `when` stopped passing since.
      for (let i = state.history.length - 2; i >= 0 && target == null; i--) {
        const step = getStep(state.history[i]);
        if (step && (await isVisible(step, signal))) target = step.id;
      }
      if (target == null) target = await findSequential(state.stepIndex, -1, signal);
      if (target == null || getState().stepId !== state.stepId) return;
      await transition(target, 'backward');
    } finally {
      navigating = false;
    }
  }

  async function goTo(stepId: TId) {
    const status = getState().status;
    if (status !== 'active') {
      await start({ stepId, force: true });
      return;
    }
    if (!getStep(stepId)) {
      reportError(new Error(`[awesome-tour] Unknown step "${stepId}" in tour "${options.id}"`));
      return;
    }
    await transition(stepId, 'jump');
  }

  async function resume() {
    const { status, stepId } = getState();
    if (status !== 'paused' && status !== 'closed') return;
    if (stepId == null || !getStep(stepId)) {
      await start({ force: true });
      return;
    }
    const ok = await transition(stepId, 'jump');
    if (ok) emitter.emit('resume', { stepId });
  }

  async function refresh() {
    const state = getState();
    const step = getStep(state.stepId);
    if (state.status !== 'active' || !step || step.target == null) return;
    const targets = resolveTarget(step.target, anchors);
    if (targets.length > 0) {
      store.setState({ targets, targetMissing: false, phase: 'ready' });
    } else if (state.phase !== 'transitioning') {
      await transition(step.id, 'jump');
    }
  }

  let routerUnsubscribe: (() => void) | undefined;
  function setRouter(next: RouterAdapter | undefined) {
    routerUnsubscribe?.();
    routerUnsubscribe = undefined;
    router = next;
    if (!router?.subscribe) return;
    routerUnsubscribe = router.subscribe(() => {
      const state = getState();
      const step = getStep(state.stepId);
      if (state.status !== 'active' || !step?.route || transitionController) return;
      if (routeMatches(step.route)) {
        if (state.phase === 'resolving') void transition(step.id, 'jump');
      } else {
        // User navigated away from the step's page: hide until they come back.
        store.setState({ phase: 'resolving' });
      }
    });
  }

  const tour: Tour<TStep, TData> = {
    id: options.id,
    version: options.version ?? 1,
    modal: options.modal ?? true,
    layer: options.layer ?? 'blocking',
    rules: options.rules,
    anchors,
    getState,
    subscribe: store.subscribe,
    on: emitter.on,
    getSteps: () => steps,
    getVisibleSteps,
    getStep: (id) => getStep(id),
    getCurrentStep: () => getStep(getState().stepId),
    setSteps(nextSteps) {
      const { stepId, stepIndex, status } = getState();
      const conditionsChanged =
        nextSteps.length !== steps.length ||
        nextSteps.some((step, i) => step.id !== steps[i]!.id || step.when !== steps[i]!.when);
      steps = nextSteps;
      if (conditionsChanged) invalidateVisibility();
      if (stepId != null && !getStep(stepId) && status === 'active') {
        // The current step was removed: continue with whatever now sits at its position.
        transitionController?.abort();
        void (async () => {
          const signal = life.signal;
          const nextId = await findSequential(Math.max(stepIndex, 0) - 1, 1, signal);
          if (signal.aborted || getState().stepId !== stepId) return;
          if (nextId == null) finish('completed');
          else await transition(nextId, 'forward');
        })();
        return;
      }
      if (entered && getStep(entered.id)) entered = getStep(entered.id)!;
      store.setState({ stepIndex: indexOf(stepId), progress: computeProgress(stepId) });
    },
    start,
    next,
    prev,
    goTo,
    complete: () => {
      const s = getState().status;
      if (s === 'active' || s === 'paused' || s === 'starting') finish('completed');
    },
    skip: () => {
      const s = getState().status;
      if (s === 'active' || s === 'paused' || s === 'starting') finish('skipped');
    },
    close: () => {
      const s = getState().status;
      if (s === 'active' || s === 'paused' || s === 'starting') finish('closed');
    },
    pause: () => {
      if (getState().status === 'active') finish('paused');
    },
    snooze(ms) {
      const { status, stepId } = getState();
      if (status !== 'active' && status !== 'paused' && status !== 'starting') return;
      finish('closed');
      emitter.emit('snooze', { stepId, until: Date.now() + ms });
    },
    resume,
    restart: () => start({ force: true, stepId: undefined }),
    setData(update) {
      const data =
        typeof update === 'function'
          ? (update as (d: TData) => TData)(getState().data)
          : ({ ...getState().data, ...update } as TData);
      store.setState({ data });
      invalidateVisibility();
      // Data can flip `when` conditions: keep "Step n of m" in sync.
      const { stepId, progress } = getState();
      if (stepId !== null) {
        const next = computeProgress(stepId);
        if (next.current !== progress.current || next.total !== progress.total) {
          store.setState({ progress: next });
        }
      }
      emitter.emit('dataChange', { data });
    },
    signal(name) {
      for (const handler of [...(signalHandlers.get(name) ?? [])]) handler();
      if (goalSignals.has(name)) goalReach?.();
    },
    refresh,
    setRouter,
    trackGoal(since) {
      // Resume watching a run's goal (after a reload); never re-arms one that is being watched.
      if (!options.goal || (goalController && !goalController.signal.aborted)) return;
      armGoal(since);
    },
    use(plugin) {
      plugins.push(plugin);
      const cleanup = plugin.setup?.(tour);
      let attached = true;
      return () => {
        if (!attached) return;
        attached = false;
        const i = plugins.indexOf(plugin);
        if (i >= 0) plugins.splice(i, 1);
        if (typeof cleanup === 'function') cleanup();
      };
    },
    isOpen: () => getState().status === 'active',
    destroy() {
      transitionController?.abort();
      transitionController = null;
      // Plugins (persistence, analytics) are detached first: tearing down isn't a user "close".
      for (const cleanup of cleanups.splice(0)) cleanup();
      leaveCurrent();
      life.abort();
      goalController?.abort();
      visibilityController.abort();
      routerUnsubscribe?.();
      const { status } = getState();
      if (status === 'active' || status === 'starting' || status === 'paused') {
        store.setState({ status: 'closed', phase: null, targets: [], targetMissing: false });
      }
      store.clear();
      emitter.clear();
      signalHandlers.clear();
    },
  };

  setRouter(router);
  for (const plugin of plugins) {
    const cleanup = plugin.setup?.(tour);
    if (typeof cleanup === 'function') cleanups.push(cleanup);
  }

  return tour;
}
