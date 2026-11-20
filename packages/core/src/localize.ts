/**
 * Step content in several languages: any text field can be a map of BCP 47 locale tags to text,
 * `{ en: 'Mixer', 'pt-BR': 'Mixer', ar: 'المِكسر' }`, and `localize` picks one.
 */

/** Text (or anything) per locale tag. */
export type Localized<T = string> = { readonly [locale: string]: T };

const LOCALE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

/** Whether `value` is a locale map (a plain object whose keys are all locale tags). */
export function isLocalized(value: unknown): value is Localized<unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  if ('$$typeof' in value) return false; // a React element
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => LOCALE_TAG.test(k));
}

/**
 * Pick the best text for `locale`: an exact match (`pt-BR`), then the language (`pt`), then any
 * regional variant of it (`pt-PT`), then `fallback`, then the first entry. Values that aren't
 * locale maps are returned as they are.
 */
export function localize<T>(
  value: T | Localized<T> | undefined,
  locale?: string | null,
  fallback = 'en',
): T | undefined {
  if (!isLocalized(value)) return value as T | undefined;
  const map = value as Localized<T>;
  const keys = Object.keys(map);
  const find = (tag: string | null | undefined) => {
    if (!tag) return undefined;
    const lower = tag.toLowerCase();
    const exact = keys.find((k) => k.toLowerCase() === lower);
    if (exact) return map[exact];
    const language = lower.split('-')[0]!;
    const base = keys.find((k) => k.toLowerCase() === language);
    if (base) return map[base];
    const regional = keys.find((k) => k.toLowerCase().split('-')[0] === language);
    return regional ? map[regional] : undefined;
  };
  return find(locale) ?? find(fallback) ?? map[keys[0]!];
}
