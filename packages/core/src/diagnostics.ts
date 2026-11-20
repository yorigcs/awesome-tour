import type { StepDefinition, TourOptions } from './types';

/**
 * Development-time warnings with stable codes, each explained at
 * https://yorigcs.github.io/awesome-tour/reference/errors/. Silent in production builds (bundlers
 * replace `process.env.NODE_ENV`) and in plain browser scripts (no `process`).
 */
declare const process: { env: Record<string, string | undefined> } | undefined;

export const DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export type DiagnosticCode =
  | 'AT001'
  | 'AT002'
  | 'AT003'
  | 'AT004'
  | 'AT005'
  | 'AT006'
  | 'AT007'
  | 'AT008'
  | 'AT009';

const DOCS = 'https://yorigcs.github.io/awesome-tour/reference/errors/';

export function warn(code: DiagnosticCode, message: string, ...details: unknown[]) {
  if (!DEV) return;
  console.warn(`[awesome-tour] ${code}: ${message}\n${DOCS}#${code.toLowerCase()}`, ...details);
}

const isSelectorValid = (selector: string) => {
  if (typeof document === 'undefined') return true;
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
};

/** Checks a tour definition for mistakes that would otherwise fail quietly at runtime. */
export function checkTour(options: TourOptions<StepDefinition<any, string>, any>) {
  if (!DEV) return;
  const ids = new Set<string>();
  for (const step of options.steps) {
    if (ids.has(step.id)) {
      warn(
        'AT001',
        `tour "${options.id}" has two steps with the id "${step.id}". The second one is unreachable.`,
      );
    }
    ids.add(step.id);
  }
  for (const step of options.steps) {
    if (typeof step.next === 'string' && !ids.has(step.next)) {
      warn(
        'AT002',
        `step "${step.id}" of tour "${options.id}" goes next to "${step.next}", which doesn't exist.`,
      );
    }
    const rules = step.advanceOn
      ? Array.isArray(step.advanceOn)
        ? step.advanceOn
        : [step.advanceOn]
      : [];
    for (const rule of rules) {
      if (rule.to && !ids.has(rule.to)) {
        warn(
          'AT003',
          `step "${step.id}" of tour "${options.id}" advances to "${rule.to}", which doesn't exist.`,
        );
      }
    }
    const selectors = (Array.isArray(step.target) ? step.target : [step.target]).filter(
      (t): t is string => typeof t === 'string',
    );
    for (const selector of selectors) {
      if (!isSelectorValid(selector)) {
        warn(
          'AT004',
          `step "${step.id}" of tour "${options.id}" has an invalid CSS selector: ${selector}`,
        );
      }
    }
  }
}
