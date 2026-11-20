import type { TourManager } from './manager';
import { matchRoute } from './router';
import { resolveTarget, waitForTarget } from './targets';
import type { RouterAdapter, StepDefinition, Tour } from './types';

/**
 * Tour health checks: walk every step of every tour, go to its route, and check its target is
 * on the page — so a refactor that breaks a tour fails CI instead of failing users.
 */

export type StepAuditStatus = 'found' | 'missing' | 'hidden' | 'no-target' | 'unchecked';

export interface StepAudit {
  stepId: string;
  status: StepAuditStatus;
  /** The page the step was checked on: its `route`, or the previous step's. */
  route?: string;
  /** Elements found. */
  count?: number;
  /** Why it's `missing`, `hidden` or `unchecked`. */
  detail?: string;
}

export interface TourAudit {
  tourId: string;
  /** No step is `missing`. */
  ok: boolean;
  steps: StepAudit[];
}

export interface AuditOptions {
  /** Router used to visit each step's `route` (the provider's). Without one, routes aren't visited. */
  router?: RouterAdapter;
  /** How long to wait for each target (ms). Default: the step's `targetTimeout`, else 3000. */
  timeout?: number;
  /** Values for route params (`/projects/:id` → `{ id: '42' }`), so pattern routes can be visited. */
  params?: Record<string, string>;
  /** Only these tours. Default: all. */
  tours?: readonly string[];
  /** How long to let a page settle after navigating (ms). Default: 50. */
  settle?: number;
  /**
   * Page where a tour's first steps (those before any `route`) are checked. Default: the tour's
   * `rules.trigger.route` if it has one, else the page the audit started on.
   */
  startRoute?: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fillRoute(route: string, params: Record<string, string> = {}): string | null {
  let missing = false;
  const path = route.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    if (params[name] === undefined) missing = true;
    return encodeURIComponent(params[name] ?? '');
  });
  if (missing || path.includes('*')) return null;
  return path;
}

async function auditStep(
  tour: Tour<any, any>,
  step: StepDefinition,
  options: AuditOptions,
  /** The page this step shows on: its own `route`, else the previous step's. */
  page: string | undefined,
): Promise<StepAudit> {
  const base: Omit<StepAudit, 'status'> = { stepId: step.id, ...(page ? { route: page } : {}) };
  if (step.when) {
    try {
      const visible = await step.when({
        tour,
        step,
        data: tour.getState().data,
        signal: new AbortController().signal,
      });
      if (!visible)
        return { ...base, status: 'hidden', detail: '`when` is false for the current data' };
    } catch (error) {
      return { ...base, status: 'hidden', detail: `\`when\` threw: ${String(error)}` };
    }
  }
  const { router } = options;
  if (step.route && !router) {
    return { ...base, status: 'unchecked', detail: 'has a route but no router was given' };
  }
  if (page && router && !(router.match ?? matchRoute)(page, router.getPath())) {
    const path = fillRoute(page, options.params);
    if (!path) {
      return { ...base, status: 'unchecked', detail: `pass \`params\` to visit ${page}` };
    }
    await router.navigate(path);
    await delay(options.settle ?? 50);
  }
  if (step.target == null) return { ...base, status: 'no-target' };
  const timeout = options.timeout ?? step.targetTimeout ?? 3000;
  const found = resolveTarget(step.target, tour.anchors).length
    ? resolveTarget(step.target, tour.anchors)
    : await waitForTarget(step.target, { anchors: tour.anchors, timeout });
  return found.length > 0
    ? { ...base, status: 'found', count: found.length }
    : { ...base, status: 'missing', detail: `not on the page after ${timeout}ms` };
}

/** Checks the tours of a manager (or a list of tours). Doesn't start them or show anything. */
export async function auditTours(
  source: TourManager | readonly Tour<any, any>[],
  options: AuditOptions = {},
): Promise<TourAudit[]> {
  const manager = Array.isArray(source) ? null : (source as TourManager);
  const initial = manager ? manager.getTours() : (source as readonly Tour<any, any>[]);
  const { router } = options;
  const start = router?.getPath();
  const audits: TourAudit[] = [];
  for (const listed of initial) {
    if (options.tours && !options.tours.includes(listed.id)) continue;
    // Go to the tour's first page before reading its steps: tours declared in a page's JSX only
    // exist (with their steps) while that page is mounted.
    let page = options.startRoute ?? listed.rules?.trigger?.route ?? start;
    const first = (listed.getSteps() as readonly StepDefinition[])[0];
    if (first?.route) page = first.route;
    if (router && page && !(router.match ?? matchRoute)(page, router.getPath())) {
      const path = fillRoute(page, options.params);
      if (path) {
        await router.navigate(path);
        await delay(options.settle ?? 50);
      }
    }
    const tour = manager?.get(listed.id) ?? listed;
    const steps: StepAudit[] = [];
    for (const step of tour.getSteps() as readonly StepDefinition[]) {
      if (step.route) page = step.route;
      steps.push(await auditStep(tour, step, options, page));
    }
    audits.push({ tourId: tour.id, ok: steps.every((s) => s.status !== 'missing'), steps });
  }
  // Leave the app where it was.
  if (options.router && start && options.router.getPath() !== start) {
    await options.router.navigate(start);
  }
  return audits;
}

/** A plain-text table of audits, for CI logs. */
export function formatAudit(audits: readonly TourAudit[]): string {
  const icon: Record<StepAuditStatus, string> = {
    found: '✓',
    missing: '✗',
    hidden: '–',
    'no-target': '○',
    unchecked: '?',
  };
  return audits
    .map((a) =>
      [
        `${a.ok ? '✓' : '✗'} ${a.tourId}`,
        ...a.steps.map(
          (s) =>
            `    ${icon[s.status]} ${s.stepId}${s.route ? ` (${s.route})` : ''}${s.detail ? ` — ${s.detail}` : ''}`,
        ),
      ].join('\n'),
    )
    .join('\n');
}

/**
 * Where a page hands its tours to a test: `TourProvider` pushes `{ manager, router, audit }`
 * here when a test created the array first (Playwright's `checkTours` does, with an init script).
 */
export const AUDIT_HOOK = '__AWESOME_TOUR_HOOK__';

export interface AuditHookEntry {
  manager: TourManager;
  router?: RouterAdapter;
  audit: (options?: AuditOptions) => Promise<TourAudit[]>;
}

/** Exposes a manager to a test harness, if one asked for it. Returns a cleanup. */
export function exposeForAudit(manager: TourManager, router?: RouterAdapter): () => void {
  const hook = (globalThis as Record<string, unknown>)[AUDIT_HOOK];
  if (!Array.isArray(hook)) return () => {};
  const entry: AuditHookEntry = {
    manager,
    ...(router ? { router } : {}),
    audit: (options = {}) => auditTours(manager, { ...(router ? { router } : {}), ...options }),
  };
  hook.push(entry);
  return () => {
    const i = hook.indexOf(entry);
    if (i >= 0) hook.splice(i, 1);
  };
}
