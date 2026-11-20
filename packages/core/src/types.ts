import type { AnchorRegistry } from './anchors';

export type MaybePromise<T> = T | Promise<T>;

/* -------------------------------------------------------------------------------------------------
 * Targets
 * -----------------------------------------------------------------------------------------------*/

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * Anything that can report a viewport rect. Compatible with Floating UI's VirtualElement.
 * Used to point tours at things that are not DOM elements (canvas regions, 3D objects, text ranges…).
 */
export interface VirtualElement {
  getBoundingClientRect(): RectLike;
  /** Element used to find scroll ancestors / owner document. */
  contextElement?: Element;
  /**
   * The real element this stands for, when it lives in another document (e.g. inside an iframe):
   * used to scroll it into view, listen to its events and notice when it is removed.
   */
  element?: Element;
}

export interface AnchorTarget {
  readonly __tourAnchor: string;
}

/** `firstOf(a, b, c)`: the first candidate that resolves to something. */
export interface FallbackTarget {
  readonly __tourFirstOf: readonly TargetInput[];
}

export type TourTargetNode = Element | VirtualElement;

export type TargetInput =
  | string
  | Element
  | VirtualElement
  | AnchorTarget
  | FallbackTarget
  | { readonly current: Element | null | undefined }
  | (() => TargetInput | null | undefined)
  | readonly TargetInput[];

export type TargetMissingPolicy = 'wait' | 'skip' | 'center' | 'error';

/**
 * What to do when a step's target is removed from the page while the step is shown.
 * `reresolve` (default): look for it again (a re-rendered element is picked up), waiting up to
 * `targetTimeout`, then fall back to `center`. `center`: keep the step, centered. `close`: close.
 */
export type TargetLostPolicy = 'reresolve' | 'center' | 'close';

/** Extra room a target needs from the viewport edges (a sticky header that sets no scroll-padding). */
export type ScrollOffset = number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;

/** `scrollIntoView` options, plus `offset` to keep targets clear of sticky/fixed bars. */
export interface TourScrollOptions extends ScrollIntoViewOptions {
  offset?: ScrollOffset;
}

/* -------------------------------------------------------------------------------------------------
 * Steps
 * -----------------------------------------------------------------------------------------------*/

export interface StepContext<TData = any, TId extends string = string> {
  tour: Tour<StepDefinition<TData, TId>, TData>;
  step: StepDefinition<TData, TId>;
  data: TData;
  /** Aborted when the transition is superseded (e.g. user clicked "next" twice quickly). */
  signal: AbortSignal;
}

export interface AdvanceOn<TData = any, TId extends string = string> {
  /** DOM event that advances the tour, dispatched on `target` (defaults to the step target). */
  event?: string;
  /** Element(s) to listen on. Defaults to the step's resolved target. */
  target?: TargetInput;
  /** Advance when this predicate becomes true. Re-checked on DOM mutations and on an interval. */
  when?: (ctx: StepContext<TData, TId>) => boolean;
  /** Advance when the app calls `tour.signal(name)`. */
  signal?: string;
  /** Advance automatically after this many milliseconds on the step. */
  delay?: number;
  /** Step to go to instead of the regular next step. */
  to?: TId;
}

export interface StepDefinition<TData = any, TId extends string = string> {
  id: TId;
  /** What to highlight. Omit (or `null`) for a centered step with no target. */
  target?: TargetInput | null;
  /** Skip this step when it returns false. */
  when?: (ctx: StepContext<TData, TId>) => MaybePromise<boolean>;
  /** Branching: explicit next step id, or a function returning one. `null` completes the tour. */
  next?: TId | null | ((ctx: StepContext<TData, TId>) => TId | null | undefined);
  /**
   * Route the step lives on. The tour navigates there (via the router adapter) before resolving
   * the target. Patterns (`/projects/:id`, `/docs/*`) aren't navigated to: the step waits until
   * the user gets there. Until the route matches, the step stays hidden (phase `resolving`).
   */
  route?: string;
  /** Make the step interactive: the tour advances when the user does something. */
  advanceOn?: AdvanceOn<TData, TId> | readonly AdvanceOn<TData, TId>[];
  /** What to do when the target cannot be found within `targetTimeout`. Default: `'center'`. */
  onTargetMissing?: TargetMissingPolicy;
  /** How long to wait for the target to appear (ms). Default: 3000. */
  targetTimeout?: number;
  /** What to do if the target is removed while the step is shown. Default: `'reresolve'`. */
  onTargetLost?: TargetLostPolicy;
  /** Scroll the target into view. Default: true. */
  scroll?: boolean | TourScrollOptions;
  /** Override tour-level `modal` for this step. */
  modal?: boolean;
  /** Runs before the step is shown (after navigation, before target resolution). */
  beforeEnter?: (ctx: StepContext<TData, TId>) => MaybePromise<void>;
  /**
   * Fail the transition when `beforeEnter` hasn't settled after this many ms. The previous step
   * stays on screen and an `error` is emitted. Default: tour-level `enterTimeout` (none).
   */
  enterTimeout?: number;
  /** Runs after the step is left. */
  afterLeave?: (ctx: StepContext<TData, TId>) => MaybePromise<void>;
  /**
   * Guard: runs before leaving the step (to another step, or to finish with `to: null`).
   * Return `false` to stay. Not called by `close()`, `skip()` or `pause()`.
   */
  beforeLeave?(
    ctx: StepContext<TData, TId>,
    info: { to: TId | null; direction: TourDirection },
  ): MaybePromise<boolean | void>;
  /**
   * Whether the user may move forward yet. Re-checked on DOM changes and every 200ms while the
   * step is shown; exposed as `state.canNext` (`Tour.Next` gets disabled) and enforced by `next()`.
   */
  canNext?: (ctx: StepContext<TData, TId>) => boolean;
  /** Free-form metadata (analytics labels, etc). */
  meta?: Record<string, unknown>;
}

export type StepIdOf<TStep extends StepDefinition> = TStep['id'];

/**
 * Compile-time check that a step's string `next` names a step of the same tour (`createTour`
 * intersects each step with this). A typo becomes a type error instead of a runtime one.
 */
export type CheckedStep<TStep, TId extends string> = TStep extends { next: infer N }
  ? N extends string
    ? N extends TId
      ? TStep
      : TStep & { next: TId }
    : TStep
  : TStep;

/** A tour's conversion: any one of the conditions, reached within `within` ms of the start. */
export interface TourGoal<TData = any> {
  /** Name reported with the event (analytics: `goal`). Default: the tour id. */
  name?: string;
  /** `tour.signal(name)` was called. */
  signal?: string;
  /** A DOM event on (or inside) `target`, e.g. `{ type: 'click', target: '#bounce' }`. */
  event?: { type: string; target?: TargetInput };
  /** The router reached this route (`/mix`, `/projects/:id`). */
  route?: string;
  /** This predicate became true (re-checked on DOM activity and on a timer). */
  when?: (ctx: { data: TData }) => boolean;
  /** Give up after this many ms from the start. Default: as long as the page lives. */
  within?: number;
}

/* -------------------------------------------------------------------------------------------------
 * State
 * -----------------------------------------------------------------------------------------------*/

export type TourStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'paused'
  | 'completed'
  | 'skipped'
  | 'closed';

export type TourPhase = 'transitioning' | 'resolving' | 'ready';

export type TourDirection = 'forward' | 'backward' | 'jump';

export interface TourProgress {
  /** 1-based position among visible steps. 0 when no step is active. */
  current: number;
  total: number;
}

export interface TourState<TId extends string = string, TData = any> {
  status: TourStatus;
  phase: TourPhase | null;
  stepId: TId | null;
  /** Index of the current step in the steps array (-1 if none). */
  stepIndex: number;
  direction: TourDirection | null;
  /** Steps visited in this run, in order. Used by `prev()` to walk back through branches. */
  history: readonly TId[];
  /** Resolved targets of the current step. Empty → centered step. */
  targets: readonly TourTargetNode[];
  /** True when the current step's target could not be found and the step fell back to centered. */
  targetMissing: boolean;
  progress: TourProgress;
  data: TData;
  error: unknown;
  /** False while the current step's `canNext` predicate fails. */
  canNext: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Events & plugins
 * -----------------------------------------------------------------------------------------------*/

export interface TransitionInfo<TId extends string = string> {
  from: TId | null;
  to: TId;
  direction: TourDirection;
}

export interface TourEvents<TId extends string = string, TData = any> {
  start: { stepId: TId };
  stepChange: { from: TId | null; to: TId; direction: TourDirection };
  stepLeave: { stepId: TId };
  targetMissing: { stepId: TId };
  /** The tour's goal was reached: where the run was, and how long after its start. */
  goal: { name: string; stepId: TId | null; status: TourStatus; afterMs: number };
  /** The shown step's target left the page. `recovered` once it was found again (or not). */
  targetLost: { stepId: TId; recovered: boolean };
  complete: { stepId: TId | null };
  skip: { stepId: TId | null };
  close: { stepId: TId | null };
  pause: { stepId: TId | null };
  resume: { stepId: TId | null };
  dataChange: { data: TData };
  error: { error: unknown; stepId: TId | null };
  /** `tour.snooze(ms)`: the tour was closed and asks not to be shown again before `until`. */
  snooze: { stepId: TId | null; until: number };
}

export interface StartResult<TId extends string = string, TData = any> {
  stepId?: TId;
  data?: Partial<TData>;
}

export interface TourPlugin<TId extends string = string, TData = any> {
  name: string;
  /** Called once when the tour is created. May return a cleanup function. */
  setup?: (tour: Tour<any, TData>) => void | (() => void);
  /** Return `false` to prevent the tour from starting, or a start step / data to resume. */
  beforeStart?: (
    tour: Tour<any, TData>,
    options: StartOptions<TId, TData>,
  ) => MaybePromise<void | false | StartResult<TId, TData>>;
  /** Return `false` to cancel a transition or a step id to redirect it. */
  beforeStep?: (
    tour: Tour<any, TData>,
    transition: TransitionInfo<TId> & {
      /** Aborted when the transition is superseded. */
      signal: AbortSignal;
    },
  ) => MaybePromise<void | false | TId>;
}

/* -------------------------------------------------------------------------------------------------
 * Router
 * -----------------------------------------------------------------------------------------------*/

export interface RouterAdapter {
  getPath(): string;
  navigate(path: string): MaybePromise<void>;
  /** Optional: notify on route changes. */
  subscribe?(listener: () => void): () => void;
  /** Optional custom matcher. Default: `matchRoute` (`:params` and a trailing `*`). */
  match?(route: string, path: string): boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Tour
 * -----------------------------------------------------------------------------------------------*/

export interface StartOptions<TId extends string = string, TData = any> {
  stepId?: TId;
  data?: Partial<TData>;
  /** Restart even if already active. */
  force?: boolean;
}

export interface TourOptions<TStep extends StepDefinition<TData, string>, TData = any> {
  id: string;
  /** Bump to invalidate persisted progress when the tour content changes meaningfully. */
  version?: number;
  /**
   * A draft being previewed (`previewFromUrl`): it never saves progress or impressions, sends no
   * analytics, and ignores display rules. UIs can badge it (`data-preview`). Default: false.
   */
  preview?: boolean;
  steps: readonly TStep[];
  data?: TData;
  /** Modal tours block the page (overlay + focus trap + inert). Default: true. */
  modal?: boolean;
  /**
   * How the tour shares the screen. `blocking` (default): one at a time — others queue behind it.
   * `ambient`: banners, toasts and hints that can show alongside anything, and never hold the queue.
   */
  layer?: 'blocking' | 'ambient';
  plugins?: readonly TourPlugin<any, TData>[];
  router?: RouterAdapter;
  anchors?: AnchorRegistry;
  /** Default target wait timeout for all steps (ms). Default: 3000. */
  targetTimeout?: number;
  /** Default policy for missing targets. Default: 'center'. */
  onTargetMissing?: TargetMissingPolicy;
  /** Default policy when a shown step's target is removed. Default: 'reresolve'. */
  onTargetLost?: TargetLostPolicy;
  /** Default scroll behavior for all steps. */
  scroll?: boolean | TourScrollOptions;
  /** Default `beforeEnter` timeout for all steps (ms). Default: none. */
  enterTimeout?: number;
  /**
   * What the tour is for: the action that counts as a conversion. Watched from each start — also
   * after the tour ends — until it happens or `within` runs out; emits `goal` once per run.
   */
  goal?: TourGoal<TData>;
  /**
   * Who sees the tour, when, and how often. Evaluated by the tour manager (`TourProvider`), which
   * also auto-starts tours with a `trigger`. Explicit `start()` calls are never blocked.
   */
  rules?: TourRules<TData>;
}

/* -------------------------------------------------------------------------------------------------
 * Display rules
 * -----------------------------------------------------------------------------------------------*/

export type DateInput = Date | string | number;

export interface TourRules<TData = any> {
  /** Targeting: return false for users who shouldn't see the tour (role, plan, flags…). */
  audience?(ctx: { data: TData }): MaybePromise<boolean>;
  /** Only show between these dates. */
  schedule?: { startsAt?: DateInput; endsAt?: DateInput };
  frequency?: {
    /**
     * Stop auto-starting after a run. `true` (default): once it was completed, skipped or
     * dismissed (closed). `'completed'`: only once completed or skipped — a dismissed tour may show
     * again (pair it with `dismissCooldownMs`). `'seen'`: after the first show. `false`: never stop.
     */
    once?: boolean | 'completed' | 'seen';
    /** After a dismissal (close/Escape), wait this long before showing again (ms). */
    dismissCooldownMs?: number;
    /**
     * Count shows and outcomes per tour `version`: bumping the version (new content) makes the
     * tour eligible again for people who already saw an older one. Default: false.
     */
    perVersion?: boolean;
    /** Show at most this many times. */
    maxShows?: number;
    /** Wait this long after a show before showing again (ms). */
    cooldownMs?: number;
  };
  /** Start automatically (when eligible) once any of these happen. */
  trigger?: {
    /** Path pattern (`/projects/:id`, `/docs/*`) — when the router reaches it. */
    route?: string;
    /** `manager.signal(name)` was called. */
    signal?: string;
    /** A DOM event on (or inside) `target`, e.g. `{ type: 'click', target: '#help' }`. */
    event?: { type: string; target?: TargetInput };
    /** This many ms after the tour is registered (page load). */
    delay?: number;
    /** When this target is on the page. */
    targetVisible?: TargetInput;
    /**
     * The user lingers on `target` — the pointer rests over it, or focus stays inside it — for
     * `ms` (default 2000). Help for the thing they're looking at.
     */
    dwell?: { target: TargetInput; ms?: number };
    /** No pointer, key, wheel or scroll activity on the page for this many ms. */
    idle?: number;
    /**
     * Frustration: `clicks` (default 3) clicks within `within` ms (default 800) on the same
     * element — inside `target` when given.
     */
    rageClick?: { target?: TargetInput; clicks?: number; within?: number };
    /**
     * `manager.signal(signal)` happened `times` times (default 2) within `within` ms (default: no
     * limit) — the same error twice, the same undo three times.
     */
    repeat?: { signal: string; times?: number; within?: number };
  };
  /** Higher wins when several triggered tours compete. Default: 0. */
  priority?: number;
}

export type EligibilityRule =
  | 'audience'
  | 'schedule'
  | 'once'
  | 'maxShows'
  | 'cooldown'
  | 'snooze'
  | 'cap'
  | 'preview';

export interface EligibilityReport {
  tourId: string;
  eligible: boolean;
  /** One entry per rule that applies to the tour, in evaluation order. */
  checks: { rule: EligibilityRule; ok: boolean; detail: string }[];
}

export type Listener = () => void;

export interface Tour<TStep extends StepDefinition<TData, string> = StepDefinition, TData = any> {
  readonly id: string;
  readonly version: number;
  /** A draft being previewed: saves nothing, tracks nothing (see `TourOptions.preview`). */
  readonly preview: boolean;
  readonly modal: boolean;
  readonly layer: 'blocking' | 'ambient';
  /** Display rules from `createTour({ rules })`. */
  readonly rules: TourRules<TData> | undefined;
  readonly anchors: AnchorRegistry;

  getState(): TourState<TStep['id'], TData>;
  subscribe(listener: Listener): () => void;
  on<K extends keyof TourEvents<TStep['id'], TData>>(
    event: K,
    handler: (payload: TourEvents<TStep['id'], TData>[K]) => void,
  ): () => void;

  getSteps(): readonly TStep[];
  /** Steps whose `when` currently passes (async predicates count as visible). */
  getVisibleSteps(): TStep[];
  getStep(id: TStep['id']): TStep | undefined;
  getCurrentStep(): TStep | undefined;
  /** Replace the step list (used by declarative step registration). */
  setSteps(steps: readonly TStep[]): void;

  start(options?: StartOptions<TStep['id'], TData>): Promise<void>;
  next(): Promise<void>;
  prev(): Promise<void>;
  goTo(stepId: TStep['id']): Promise<void>;
  /** Mark the tour as finished successfully. */
  complete(): void;
  /** User explicitly opted out of the tour. */
  skip(): void;
  /** Dismiss the tour (can be resumed later). */
  close(): void;
  pause(): void;
  resume(): Promise<void>;
  restart(): Promise<void>;
  /** Close the tour and ask not to show it again for `ms` (recorded by the tour manager). */
  snooze(ms: number): void;

  setData(update: Partial<TData> | ((data: TData) => TData)): void;
  /** Fire a named signal (used by `advanceOn.signal`). */
  signal(name: string): void;
  /** Re-run target resolution for the current step (e.g. after layout changes). */
  refresh(): Promise<void>;
  setRouter(router: RouterAdapter | undefined): void;

  isOpen(): boolean;
  /**
   * Attach a plugin after creation (runs its `setup`). Returns a function that detaches it and runs
   * its cleanup. Frameworks use this to tie plugins to a component's lifetime.
   */
  /**
   * Watch the tour's `goal` for a run that started at `since` (a timestamp), e.g. after a reload
   * when the tour itself won't start again. `persist()` does this for you. No-op without a goal,
   * once `within` has passed, or while a goal is already being watched.
   */
  trackGoal(since: number): void;
  use(plugin: TourPlugin<any, TData>): () => void;
  destroy(): void;
}
