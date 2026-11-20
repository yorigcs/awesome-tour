import type { Tour } from './types';

/**
 * A/B tests for onboarding: each user gets one variant of a tour (or none, for a control group),
 * the same one every visit, and analytics events carry the experiment and variant.
 */

export interface ExperimentOptions {
  id: string;
  /** Variant name → tour. `null` is a control group that sees nothing. */
  variants: Record<string, Tour<any, any> | null>;
  /** Relative weights per variant. Default: equal. */
  weights?: Record<string, number>;
  /**
   * Who is being assigned. With an id, assignment is a stable hash of `experiment:user` (same
   * variant on every device). Without one, a random variant is remembered in localStorage.
   */
  userId?: string | (() => string | null | undefined);
  /** Assign yourself (a feature-flag service): return a variant name. */
  assign?: (info: { experimentId: string; userId: string | null; variants: string[] }) => string;
  /** Called once per run when the user is exposed to the experiment (control included). */
  onExposure?: (info: { experimentId: string; variant: string }) => void;
}

export interface Experiment {
  readonly id: string;
  readonly variants: readonly string[];
  /** The tours of every variant (register them all with your provider/manager). */
  readonly tours: readonly Tour<any, any>[];
  /** This user's variant. */
  variant(): string;
  /** This user's tour, or `null` in the control group. */
  tour(): Tour<any, any> | null;
  /**
   * Expose the user: report the exposure and start their variant's tour (through `start`, e.g.
   * `(id) => manager.start(id)`, or `tour.start()`). The control group only reports.
   */
  start(start?: (tourId: string) => unknown): Promise<void>;
  /** Forget a locally remembered assignment (no-op for user-id hashing). */
  reset(): void;
}

const tagged = new WeakMap<object, { experimentId: string; variant: string }>();

/** The experiment and variant a tour belongs to (used by the analytics plugin). */
export function getExperiment(tour: object): { experimentId: string; variant: string } | undefined {
  return tagged.get(tour);
}

/** FNV-1a, 32-bit: a stable, well-spread hash for bucketing. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick(variants: string[], weights: Record<string, number> | undefined, unit: number) {
  const w = variants.map((v) => Math.max(0, weights?.[v] ?? 1));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let point = unit * total;
  for (let i = 0; i < variants.length; i++) {
    point -= w[i]!;
    if (point < 0) return variants[i]!;
  }
  return variants[variants.length - 1]!;
}

const storageKey = (id: string) => `awesome-tour-experiment:${id}`;
const memory = new Map<string, string>();

function remembered(id: string): string | null {
  try {
    return globalThis.localStorage?.getItem(storageKey(id)) ?? memory.get(id) ?? null;
  } catch {
    return memory.get(id) ?? null;
  }
}

function remember(id: string, variant: string) {
  memory.set(id, variant);
  try {
    globalThis.localStorage?.setItem(storageKey(id), variant);
  } catch {
    /* private mode */
  }
}

export function createExperiment(options: ExperimentOptions): Experiment {
  const names = Object.keys(options.variants);
  if (names.length === 0)
    throw new Error(`[awesome-tour] Experiment "${options.id}" has no variants`);
  for (const [variant, tour] of Object.entries(options.variants)) {
    if (tour) tagged.set(tour, { experimentId: options.id, variant });
  }

  let cached: string | null = null;
  const userId = () =>
    (typeof options.userId === 'function' ? options.userId() : options.userId) ?? null;

  const variant = () => {
    if (cached) return cached;
    const user = userId();
    let chosen: string;
    if (options.assign) {
      chosen = options.assign({ experimentId: options.id, userId: user, variants: names });
    } else if (user) {
      chosen = pick(names, options.weights, hashString(`${options.id}:${user}`) / 2 ** 32);
    } else {
      const saved = remembered(options.id);
      chosen = saved && names.includes(saved) ? saved : pick(names, options.weights, Math.random());
      remember(options.id, chosen);
    }
    if (!names.includes(chosen)) {
      throw new Error(
        `[awesome-tour] Experiment "${options.id}" assigned unknown variant "${chosen}"`,
      );
    }
    cached = chosen;
    return chosen;
  };

  return {
    id: options.id,
    variants: names,
    tours: Object.values(options.variants).filter((t): t is Tour<any, any> => t !== null),
    variant,
    tour: () => options.variants[variant()] ?? null,
    async start(start) {
      const name = variant();
      options.onExposure?.({ experimentId: options.id, variant: name });
      const tour = options.variants[name];
      if (!tour) return;
      if (start) await start(tour.id);
      else await tour.start();
    },
    reset() {
      cached = null;
      memory.delete(options.id);
      try {
        globalThis.localStorage?.removeItem(storageKey(options.id));
      } catch {
        /* ignore */
      }
    },
  };
}
