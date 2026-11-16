/**
 * `@awesome-tour/core/json` — tours as data. Store them in a CMS or serve them from your API,
 * validate them against `@awesome-tour/core/schema.json`, and turn them into tour options.
 * Functions can't travel in JSON, so predicates and hooks are referenced by name and supplied
 * through `actions`.
 */
import { anchor } from './anchors';
import type {
  AdvanceOn,
  StepContext,
  StepDefinition,
  TargetInput,
  TargetMissingPolicy,
  TourOptions,
  TourRules,
} from './types';

export type TargetJSON = string | { anchor: string } | (string | { anchor: string })[];

export interface AdvanceJSON {
  event?: string;
  target?: TargetJSON;
  signal?: string;
  delay?: number;
  /** Name of an action returning a boolean. */
  when?: string;
  to?: string;
}

export interface StepJSON {
  id: string;
  title?: string;
  description?: string;
  target?: TargetJSON | null;
  route?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  modal?: boolean;
  interactive?: boolean;
  scroll?: boolean;
  onTargetMissing?: TargetMissingPolicy;
  targetTimeout?: number;
  /** Action name: show the step only when it returns true. */
  when?: string;
  /** A step id, `null` to finish, or `{ action }` to decide at runtime. */
  next?: string | null | { action: string };
  /** Action names. */
  beforeEnter?: string;
  afterLeave?: string;
  canNext?: string;
  advanceOn?: AdvanceJSON | AdvanceJSON[];
  meta?: Record<string, unknown>;
}

export interface TourJSON {
  $schema?: string;
  id: string;
  version?: number;
  modal?: boolean;
  layer?: 'blocking' | 'ambient';
  targetTimeout?: number;
  onTargetMissing?: TargetMissingPolicy;
  data?: Record<string, unknown>;
  rules?: {
    /** Action name. */
    audience?: string;
    schedule?: { startsAt?: string; endsAt?: string };
    frequency?: { once?: boolean; maxShows?: number; cooldownMs?: number };
    trigger?: {
      route?: string;
      signal?: string;
      event?: { type: string; target?: TargetJSON };
      delay?: number;
      targetVisible?: TargetJSON;
    };
    priority?: number;
  };
  steps: StepJSON[];
}

/** The step shape `fromJSON` produces (core fields + the React-rendered ones). */
export type JSONStep = StepDefinition & {
  title?: string;
  description?: string;
  side?: StepJSON['side'];
  align?: StepJSON['align'];
  interactive?: boolean;
};

export type TourAction = (ctx: StepContext | { data: any }) => unknown;

export interface FromJSONOptions
  extends Partial<Omit<TourOptions<JSONStep>, 'id' | 'steps' | 'rules'>> {
  /** Functions referenced by name from the JSON (`when`, `next`, `audience`, hooks). */
  actions?: Record<string, TourAction>;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate a tour document. Returns human-readable problems; empty means valid. */
export function validateTourJSON(json: unknown, actions: Record<string, unknown> = {}): string[] {
  const errors: string[] = [];
  if (!isObj(json)) return ['tour must be an object'];
  if (typeof json.id !== 'string' || !json.id) errors.push('tour.id must be a non-empty string');
  if (!Array.isArray(json.steps) || json.steps.length === 0) {
    errors.push('tour.steps must be a non-empty array');
    return errors;
  }
  const ids = new Set<string>();
  const needAction = (path: string, name: unknown) => {
    if (name === undefined) return;
    if (typeof name !== 'string') errors.push(`${path} must be an action name (string)`);
    else if (!(name in actions)) errors.push(`${path}: unknown action "${name}"`);
  };
  json.steps.forEach((step: unknown, i: number) => {
    const at = `steps[${i}]`;
    if (!isObj(step)) {
      errors.push(`${at} must be an object`);
      return;
    }
    if (typeof step.id !== 'string' || !step.id) errors.push(`${at}.id must be a non-empty string`);
    else if (ids.has(step.id)) errors.push(`${at}.id "${step.id}" is duplicated`);
    else ids.add(step.id);
    needAction(`${at}.when`, step.when);
    needAction(`${at}.beforeEnter`, step.beforeEnter);
    needAction(`${at}.afterLeave`, step.afterLeave);
    needAction(`${at}.canNext`, step.canNext);
    if (isObj(step.next)) needAction(`${at}.next.action`, step.next.action);
    const rules = step.advanceOn === undefined ? [] : [step.advanceOn].flat();
    rules.forEach((r, j) => {
      if (isObj(r)) needAction(`${at}.advanceOn[${j}].when`, r.when);
    });
  });
  json.steps.forEach((step: unknown, i: number) => {
    if (!isObj(step)) return;
    if (typeof step.next === 'string' && !ids.has(step.next))
      errors.push(`steps[${i}].next: unknown step "${step.next}"`);
    for (const r of step.advanceOn === undefined ? [] : [step.advanceOn].flat()) {
      if (isObj(r) && typeof r.to === 'string' && !ids.has(r.to))
        errors.push(`steps[${i}].advanceOn.to: unknown step "${r.to}"`);
    }
  });
  if (isObj(json.rules)) needAction('rules.audience', json.rules.audience);
  return errors;
}

function target(input: TargetJSON | null | undefined): TargetInput | null | undefined {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map((t) => target(t) as TargetInput);
  return typeof input === 'string' ? input : anchor(input.anchor);
}

/**
 * Turn a tour document into options for `createTour`. Throws (with every problem listed) when the
 * document is invalid.
 *
 * @example
 * const doc = await fetch('/api/tours/onboarding').then((r) => r.json());
 * const tour = createTour(fromJSON(doc, { actions: { isAdmin: (ctx) => ctx.data.role === 'admin' } }));
 */
export function fromJSON(json: TourJSON, options: FromJSONOptions = {}): TourOptions<JSONStep> {
  const { actions = {}, ...overrides } = options;
  const errors = validateTourJSON(json, actions);
  if (errors.length) {
    throw new Error(`[awesome-tour] Invalid tour JSON:\n- ${errors.join('\n- ')}`);
  }
  const act = <T>(name: string | undefined) => (name ? (actions[name] as unknown as T) : undefined);

  const steps: JSONStep[] = json.steps.map((s) => {
    const advance = s.advanceOn === undefined ? undefined : [s.advanceOn].flat();
    const step: JSONStep = {
      id: s.id,
      ...(s.title !== undefined ? { title: s.title } : {}),
      ...(s.description !== undefined ? { description: s.description } : {}),
      ...(s.target !== undefined ? { target: target(s.target) } : {}),
      ...(s.route !== undefined ? { route: s.route } : {}),
      ...(s.side ? { side: s.side } : {}),
      ...(s.align ? { align: s.align } : {}),
      ...(s.modal !== undefined ? { modal: s.modal } : {}),
      ...(s.interactive !== undefined ? { interactive: s.interactive } : {}),
      ...(s.scroll !== undefined ? { scroll: s.scroll } : {}),
      ...(s.onTargetMissing ? { onTargetMissing: s.onTargetMissing } : {}),
      ...(s.targetTimeout !== undefined ? { targetTimeout: s.targetTimeout } : {}),
      ...(s.meta ? { meta: s.meta } : {}),
    };
    if (s.when) step.when = act(s.when);
    if (s.beforeEnter) step.beforeEnter = act(s.beforeEnter);
    if (s.afterLeave) step.afterLeave = act(s.afterLeave);
    if (s.canNext) step.canNext = act(s.canNext);
    if (s.next !== undefined) {
      step.next = typeof s.next === 'object' && s.next !== null ? act(s.next.action) : s.next;
    }
    if (advance) {
      step.advanceOn = advance.map(
        (r): AdvanceOn => ({
          ...(r.event ? { event: r.event } : {}),
          ...(r.target !== undefined ? { target: target(r.target) as TargetInput } : {}),
          ...(r.signal ? { signal: r.signal } : {}),
          ...(r.delay !== undefined ? { delay: r.delay } : {}),
          ...(r.to ? { to: r.to } : {}),
          ...(r.when ? { when: act(r.when) } : {}),
        }),
      );
    }
    return step;
  });

  let rules: TourRules | undefined;
  if (json.rules) {
    const { audience, trigger: t, schedule, frequency, priority } = json.rules;
    const trigger: NonNullable<TourRules['trigger']> = {};
    if (t?.route) trigger.route = t.route;
    if (t?.signal) trigger.signal = t.signal;
    if (t?.delay !== undefined) trigger.delay = t.delay;
    if (t?.event) {
      trigger.event = { type: t.event.type };
      if (t.event.target !== undefined)
        trigger.event.target = target(t.event.target) as TargetInput;
    }
    if (t?.targetVisible !== undefined)
      trigger.targetVisible = target(t.targetVisible) as TargetInput;
    rules = {
      ...(schedule ? { schedule } : {}),
      ...(frequency ? { frequency } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(audience ? { audience: act<NonNullable<TourRules['audience']>>(audience) } : {}),
      ...(t ? { trigger } : {}),
    };
  }

  return {
    id: json.id,
    steps,
    ...(json.version !== undefined ? { version: json.version } : {}),
    ...(json.modal !== undefined ? { modal: json.modal } : {}),
    ...(json.layer ? { layer: json.layer } : {}),
    ...(json.targetTimeout !== undefined ? { targetTimeout: json.targetTimeout } : {}),
    ...(json.onTargetMissing ? { onTargetMissing: json.onTargetMissing } : {}),
    ...(json.data ? { data: json.data } : {}),
    ...(rules ? { rules } : {}),
    ...overrides,
  };
}
