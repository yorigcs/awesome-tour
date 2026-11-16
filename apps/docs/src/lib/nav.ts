import { type CollectionEntry, getCollection } from 'astro:content';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface NavLink {
  slug: string;
  href: string;
  label: string;
  /** Booklet page number, e.g. "B·04". */
  folio: string;
}

export interface NavGroup {
  /** Section letter in the booklet. */
  letter: string;
  label: string;
  links: NavLink[];
}

const GROUPS: { letter: string; label: string; dir?: string; slugs?: string[] }[] = [
  { letter: 'A', label: 'Getting started', slugs: ['introduction', 'installation', 'quick-start'] },
  { letter: 'B', label: 'Guides', dir: 'guides' },
  { letter: 'C', label: 'Components', dir: 'components' },
  { letter: 'D', label: 'Registry', dir: 'registry' },
  { letter: 'E', label: 'API reference', dir: 'reference' },
  { letter: 'F', label: 'Project', slugs: ['changelog'] },
];

const byOrder = (a: CollectionEntry<'docs'>, b: CollectionEntry<'docs'>) =>
  (a.data.sidebar?.order ?? 999) - (b.data.sidebar?.order ?? 999) ||
  a.data.title.localeCompare(b.data.title);

export const hrefFor = (slug: string) => `${BASE}/${slug}/`;

export async function getNav(): Promise<NavGroup[]> {
  const entries = await getCollection('docs');
  return GROUPS.map(({ letter, label, dir, slugs }) => {
    const items = slugs
      ? slugs.map((s) => entries.find((e) => e.id === s)).filter((e) => e !== undefined)
      : entries.filter((e) => e.id.startsWith(`${dir}/`)).sort(byOrder);
    return {
      letter,
      label,
      links: items.map((e, i) => ({
        slug: e.id,
        href: hrefFor(e.id),
        label: e.data.sidebar?.label ?? e.data.title,
        folio: `${letter}·${String(i + 1).padStart(2, '0')}`,
      })),
    };
  });
}

export async function getPager(slug: string) {
  const flat = (await getNav()).flatMap((g) => g.links);
  const i = flat.findIndex((l) => l.slug === slug);
  return { prev: flat[i - 1], current: flat[i], next: flat[i + 1] };
}
