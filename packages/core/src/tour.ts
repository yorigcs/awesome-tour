import { defaultAnchors } from './anchors';
import { isElement, scrollTargetsIntoView } from './dom';
import { createEmitter } from './emitter';
import { createStore } from './store';
import { resolveTarget, waitForTarget } from './targets';
import type {
  AdvanceOn,
  RouterAdapter,
  StartOptions,
  StepContext,
  StepDefinition,
  Tour,
  TourDirection,
  TourEvents,
  TourOptions,
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

function defaultMatch(route: string, path: string) {
  return route === path;
}

/**
 * Create a headless tour. Framework agnostic: drive it imperatively, or bind it to UI through
 * `subscribe`/`getState` (e.g. React's `useSyncExternalStore`).
 */
export function createTour<
  const TStep extends StepDefinition<TData, string>,
  TData = Record<string, unknown>,
>(options: TourOptions<TStep, TData>): Tour<TStep, TData> {
  type TId = TStep['id'];
  type State = TourState<TId, TData>;

  const anchors = options.anchors ?? defaultAnchors;
  const plugins = options.plugins ?? [];
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
  });

  const emitter = createEmitter<TourEvents<TId, TData>>((error) => {
    console.error('[awesome-tour] event handler threw', error);
  });

  /** Controls the in-flight transition. Aborted when superseded. */
  let transitionController: AbortController | null = null;
  /** Controls listeners that live while a step is shown (advanceOn). */
  let stepController: AbortController | null = null;
  const signalHandlers = new Map<string, Set<() => void>>();
  const cleanups: (() => void)[] = [];

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
    emitter.emit('error', { error, stepId: getState().stepId });
  };

  async function isVisible(step: TStep, signal: AbortSignal): Promise<boolean> {
    if (!step.when) return true;
    try {
      return Boolean(await step.when(context(step, signal)));
    } catch (error) {
      reportError(error);
      return false;
    }
  }

  /** Steps whose `when` currently passes. Async predicates count as visible. */
  function getVisibleSteps(): TStep[] {
    const signal = new AbortController().signal;
    return steps.filter((step) => {
      if (!step.when) return true;
      try {
        const result = step.when(context(step, signal));
        return result instanceof Promise ? true : Boolean(result);
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

  function leaveCurrent() {
    stepController?.abort();
    stepController = null;
    const { stepId } = getState();
    const step = getStep(stepId);
    if (!step || stepId == null) return;
    emitter.emit('stepLeave', { stepId });
    if (step.afterLeave) {
      Promise.resolve()
        .then(() => step.afterLeave!(context(step, new AbortController().signal)))
        .catch(reportError);
    }
  }

  function routeMatches(route: string) {
    if (!router) return true;
    return (router.match ?? defaultMatch)(route, router.getPath());
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
    let to = requested;

    try {
      for (const plugin of plugins) {
        if (!plugin.beforeStep) continue;
        const result = await plugin.beforeStep(tour, { from, to, direction });
        if (signal.aborted) return false;
        if (result === false) return false;
        if (typeof result === 'string') to = result as TId;
      }

      const step = getStep(to);
      if (!step) throw new Error(`[awesome-tour] Unknown step "${to}" in tour "${options.id}"`);

      leaveCurrent();
      store.setState({ phase: 'transitioning', direction });

      if (step.route && router && !routeMatches(step.route)) {
        await router.navigate(step.route);
        if (signal.aborted) return false;
      }

      if (step.beforeEnter) {
        await step.beforeEnter(context(step, signal));
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
            if (nextId == null) {
              if (direction === 'backward') return false;
              finish('completed');
              return false;
            }
            return transition(nextId, direction);
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
      });
      emitter.emit('stepChange', { from, to: step.id, direction });

      const scroll = step.scroll ?? options.scroll ?? true;
      if (scroll && targets.length > 0) {
        await scrollTargetsIntoView(targets, typeof scroll === 'object' ? scroll : {});
        if (signal.aborted) return true;
      }

      store.setState({ phase: 'ready' });
      setupAdvance(step);
      if (transitionController === controller) transitionController = null;
      return true;
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return false;
      if (transitionController === controller) transitionController = null;
      store.setState({ phase: getState().stepId ? 'ready' : null });
      reportError(error);
      return false;
    }
  }

  function setupAdvance(step: TStep) {
    const rules = toArray(
      step.advanceOn as AdvanceOn<TData, TId> | readonly AdvanceOn<TData, TId>[],
    );
    if (rules.length === 0) return;
    const controller = new AbortController();
    stepController = controller;
    const { signal } = controller;

    for (const rule of rules) {
      let fired = false;
      const advance = () => {
        if (fired || signal.aborted || getState().stepId !== step.id) return;
        fired = true;
        if (rule.to) void goTo(rule.to);
        else void next();
      };

      if (rule.event && typeof document !== 'undefined') {
        const listener = (event: Event) => {
          const nodes = rule.target ? resolveTarget(rule.target, anchors) : getState().targets;
          const path = event.composedPath();
          if (
            nodes.some(
              (node) =>
                isElement(node) && (path.includes(node) || node.contains(event.target as Node)),
            )
          ) {
            advance();
          }
        };
        document.addEventListener(rule.event, listener, { capture: true, signal });
      }

      if (rule.when) {
        const check = () => {
          try {
            if (rule.when!(context(step, signal))) advance();
          } catch (error) {
            reportError(error);
          }
        };
        const interval = setInterval(check, 200);
        const unsubscribe = store.subscribe(check);
        let mo: MutationObserver | undefined;
        if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
          mo = new MutationObserver(check);
          mo.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          });
        }
        signal.addEventListener('abort', () => {
          clearInterval(interval);
          unsubscribe();
          mo?.disconnect();
        });
        queueMicrotask(check);
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
   * Public API
   * -------------------------------------------------------------------------------------------*/

  async function start(startOptions: StartOptions<TId, TData> = {}) {
    const current = getState();
    if (!startOptions.force && (current.status === 'active' || current.status === 'starting'))
      return;

    transitionController?.abort();
    leaveCurrent();
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
    let stepId = startOptions.stepId;
    try {
      for (const plugin of plugins) {
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
      if (ok) emitter.emit('start', { stepId: getState().stepId as TId });
      else if (getState().status === 'starting') store.setState({ status: 'idle', phase: null });
    } catch (error) {
      if (isAbortError(error)) return;
      store.setState({ status: 'idle', phase: null });
      reportError(error);
    }
  }

  async function next() {
    const state = getState();
    if (state.status !== 'active') return;
    const step = getStep(state.stepId);
    if (!step) return;
    const signal = new AbortController().signal;
    try {
      const nextId = await resolveForward(step, signal);
      if (getState().stepId !== step.id || getState().status !== 'active') return;
      if (nextId == null) finish('completed');
      else await transition(nextId, 'forward');
    } catch (error) {
      reportError(error);
    }
  }

  async function prev() {
    const state = getState();
    if (state.status !== 'active') return;
    let target: TId | null = null;
    if (state.history.length > 1) target = state.history[state.history.length - 2]!;
    else target = await findSequential(state.stepIndex, -1, new AbortController().signal);
    if (target == null) return;
    await transition(target, 'backward');
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
      if (state.status !== 'active' || !step?.route || state.phase === 'transitioning') return;
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
    anchors,
    getState,
    subscribe: store.subscribe,
    on: emitter.on,
    getSteps: () => steps,
    getVisibleSteps,
    getStep: (id) => getStep(id),
    getCurrentStep: () => getStep(getState().stepId),
    setSteps(nextSteps) {
      steps = nextSteps;
      const { stepId } = getState();
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
      if (s === 'active' || s === 'starting') finish('closed');
    },
    pause: () => {
      if (getState().status === 'active') finish('paused');
    },
    resume,
    restart: () => start({ force: true, stepId: undefined }),
    setData(update) {
      const data =
        typeof update === 'function'
          ? (update as (d: TData) => TData)(getState().data)
          : ({ ...getState().data, ...update } as TData);
      store.setState({ data });
      emitter.emit('dataChange', { data });
    },
    signal(name) {
      for (const handler of [...(signalHandlers.get(name) ?? [])]) handler();
    },
    refresh,
    setRouter,
    isOpen: () => getState().status === 'active',
    destroy() {
      transitionController?.abort();
      stepController?.abort();
      routerUnsubscribe?.();
      for (const cleanup of cleanups.splice(0)) cleanup();
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
