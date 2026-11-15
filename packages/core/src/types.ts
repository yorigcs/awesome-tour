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
}

export interface AnchorTarget {
  readonly __tourAnchor: string;
}

export type TourTargetNode = Element | VirtualElement;

export type TargetInput =
  | string
  | Element
  | VirtualElement
  | AnchorTarget
  | { readonly current: Element | null | undefined }
  | (() => TargetInput | null | undefined)
  | readonly TargetInput[];

export type TargetMissingPolicy = 'wait' | 'skip' | 'center' | 'error';

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
  /** Route the step lives on. The tour navigates there (via the router adapter) before resolving. */
  route?: string;
  /** Make the step interactive: the tour advances when the user does something. */
  advanceOn?: AdvanceOn<TData, TId> | readonly AdvanceOn<TData, TId>[];
  /** What to do when the target cannot be found within `targetTimeout`. Default: `'center'`. */
  onTargetMissing?: TargetMissingPolicy;
  /** How long to wait for the target to appear (ms). Default: 3000. */
  targetTimeout?: number;
  /** Scroll the target into view. Default: true. */
  scroll?: boolean | ScrollIntoViewOptions;
  /** Override tour-level `modal` for this step. */
  modal?: boolean;
  /** Runs before the step is shown (after navigation, before target resolution). */
  beforeEnter?: (ctx: StepContext<TData, TId>) => MaybePromise<void>;
  /** Runs after the step is left. */
  afterLeave?: (ctx: StepContext<TData, TId>) => MaybePromise<void>;
  /** Free-form metadata (analytics labels, etc). */
  meta?: Record<string, unknown>;
}

export type StepIdOf<TStep extends StepDefinition> = TStep['id'];

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
  complete: { stepId: TId | null };
  skip: { stepId: TId | null };
  close: { stepId: TId | null };
  pause: { stepId: TId | null };
  resume: { stepId: TId | null };
  dataChange: { data: TData };
  error: { error: unknown; stepId: TId | null };
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
    transition: TransitionInfo<TId>,
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
  /** Optional custom matcher. Default: exact pathname match. */
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
  steps: readonly TStep[];
  data?: TData;
  /** Modal tours block the page (overlay + focus trap + inert). Default: true. */
  modal?: boolean;
  plugins?: readonly TourPlugin<any, TData>[];
  router?: RouterAdapter;
  anchors?: AnchorRegistry;
  /** Default target wait timeout for all steps (ms). Default: 3000. */
  targetTimeout?: number;
  /** Default policy for missing targets. Default: 'center'. */
  onTargetMissing?: TargetMissingPolicy;
  /** Default scroll behavior for all steps. */
  scroll?: boolean | ScrollIntoViewOptions;
}

export type Listener = () => void;

export interface Tour<TStep extends StepDefinition<TData, string> = StepDefinition, TData = any> {
  readonly id: string;
  readonly version: number;
  readonly modal: boolean;
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

  setData(update: Partial<TData> | ((data: TData) => TData)): void;
  /** Fire a named signal (used by `advanceOn.signal`). */
  signal(name: string): void;
  /** Re-run target resolution for the current step (e.g. after layout changes). */
  refresh(): Promise<void>;
  setRouter(router: RouterAdapter | undefined): void;

  isOpen(): boolean;
  destroy(): void;
}
