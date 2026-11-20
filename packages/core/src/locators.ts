import { isBrowser } from './dom';
import { deepQuerySelectorAll } from './targets';
import type { FallbackTarget, TargetInput } from './types';

/**
 * Resilient targets: locate elements the way users and tests see them (a test id, a role and an
 * accessible name, visible text) instead of by CSS structure that changes with every refactor.
 * Each helper returns an ordinary function target, so it composes with everything else.
 */

export interface LocatorOptions {
  /** Only search inside this element (or the first match of this selector). */
  within?: Element | string;
}

function roots(within: LocatorOptions['within']): ParentNode[] {
  if (!isBrowser) return [];
  if (!within) return [document];
  if (typeof within === 'string') return deepQuerySelectorAll(within);
  return [within];
}

const cssEscape = (value: string) =>
  typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');

/**
 * Elements carrying `data-tour="name"` (the attribute devtools' picker and the testing kit use).
 * Stable across refactors: nothing but the attribute matters.
 */
export function byTour(name: string, options: LocatorOptions = {}): () => Element[] {
  const selector = `[data-tour="${cssEscape(name)}"]`;
  return () => roots(options.within).flatMap((root) => deepQuerySelectorAll(selector, root));
}

/* -------------------------------------------------------------------------------------------------
 * Roles and accessible names (the common subset: enough to find what a user can see and name).
 * -----------------------------------------------------------------------------------------------*/

const IMPLICIT_ROLES: Record<string, string> = {
  button: 'button,input[type=button],input[type=submit],input[type=reset],summary',
  link: 'a[href],area[href]',
  heading: 'h1,h2,h3,h4,h5,h6',
  textbox:
    'textarea,input:not([type]),input[type=text],input[type=email],input[type=search],input[type=tel],input[type=url],input[type=password]',
  checkbox: 'input[type=checkbox]',
  radio: 'input[type=radio]',
  slider: 'input[type=range]',
  spinbutton: 'input[type=number]',
  combobox: 'select',
  navigation: 'nav',
  main: 'main',
  banner: 'header',
  contentinfo: 'footer',
  region: 'section[aria-label],section[aria-labelledby]',
  form: 'form[aria-label],form[aria-labelledby]',
  list: 'ul,ol',
  listitem: 'li',
  img: 'img[alt]:not([alt=""])',
  dialog: 'dialog',
  table: 'table',
  row: 'tr',
};

function textOf(id: string, doc: Document) {
  return doc.getElementById(id)?.textContent?.trim() ?? '';
}

/** The element's ARIA role: explicit `role`, else the implicit one of common elements. */
export function roleOf(el: Element): string | null {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit.split(/\s+/)[0] ?? null;
  for (const [role, selector] of Object.entries(IMPLICIT_ROLES)) {
    if (el.matches(selector)) return role;
  }
  return null;
}

/** Accessible name, simplified: aria-labelledby, aria-label, labels, alt, title, then text. */
export function accessibleName(el: Element): string {
  const doc = el.ownerDocument;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const name = labelledBy
      .split(/\s+/)
      .map((id) => textOf(id, doc))
      .filter(Boolean)
      .join(' ');
    if (name) return name;
  }
  const label = el.getAttribute('aria-label');
  if (label?.trim()) return label.trim();
  const labels = (el as HTMLInputElement).labels;
  if (labels?.length) {
    return Array.from(labels)
      .map((l) => l.textContent?.trim() ?? '')
      .join(' ')
      .trim();
  }
  const alt = el.getAttribute('alt');
  if (alt?.trim()) return alt.trim();
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text;
  return el.getAttribute('title')?.trim() ?? (el as HTMLInputElement).placeholder ?? '';
}

const matches = (value: string, expected: string | RegExp, exact: boolean) =>
  typeof expected === 'string'
    ? exact
      ? value === expected
      : value.toLowerCase().includes(expected.toLowerCase())
    : expected.test(value);

export interface ByRoleOptions extends LocatorOptions {
  /** Accessible name: a substring (case-insensitive) or a RegExp. */
  name?: string | RegExp;
  /** Match `name` exactly. Default: false. */
  exact?: boolean;
}

/**
 * Elements with this ARIA role (explicit `role="…"` or the element's implicit one) and, optionally,
 * this accessible name: `byRole('button', { name: 'Export' })`.
 */
export function byRole(role: string, options: ByRoleOptions = {}): () => Element[] {
  const implicit = IMPLICIT_ROLES[role];
  const selector = implicit
    ? `[role="${cssEscape(role)}"],${implicit}`
    : `[role="${cssEscape(role)}"]`;
  return () =>
    roots(options.within).flatMap((root) =>
      deepQuerySelectorAll(selector, root).filter((el) => {
        const explicit = el.getAttribute('role');
        if (explicit && explicit !== role) return false; // `<button role="tab">` is a tab
        if (options.name === undefined) return true;
        return matches(accessibleName(el), options.name, options.exact ?? false);
      }),
    );
}

export interface ByTextOptions extends LocatorOptions {
  /** Match the whole text exactly. Default: false (case-insensitive substring). */
  exact?: boolean;
  /** Narrow the candidates, e.g. `'button, a'`. Default: any element. */
  selector?: string;
}

/**
 * The innermost elements whose text matches: `byText('Bounce')`. Prefer `byRole` when the element
 * has a role; text is for things that are only text.
 */
export function byText(text: string | RegExp, options: ByTextOptions = {}): () => Element[] {
  const selector = options.selector ?? '*';
  const exact = options.exact ?? false;
  return () =>
    roots(options.within).flatMap((root) => {
      const candidates = deepQuerySelectorAll(selector, root).filter((el) => {
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName)) return false;
        const value = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        return value !== '' && matches(value, text, exact);
      });
      // Innermost only: drop elements that contain another match.
      return candidates.filter(
        (el) => !candidates.some((other) => other !== el && el.contains(other)),
      );
    });
}

/**
 * A fallback chain: the first input that resolves to something wins.
 * `firstOf(byTour('export'), byRole('button', { name: 'Export' }), '#export')`.
 * (An array means "all of these at once"; `firstOf` means "the first one that exists".)
 */
export function firstOf(...candidates: TargetInput[]): FallbackTarget {
  return { __tourFirstOf: candidates };
}
