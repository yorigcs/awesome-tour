// Builds the changelog page from the packages' CHANGELOG.md files (written by changesets), merged
// by version: linked packages are released together and often share the same notes.
import { marked } from 'marked';

const files = import.meta.glob<string>('../../../../packages/*/CHANGELOG.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface ChangelogGroup {
  /** Short package names, e.g. `core`, `react`. */
  packages: string[];
  html: string;
}

export interface ChangelogRelease {
  version: string;
  /** Heading id, e.g. `v0-1-1`. */
  slug: string;
  groups: ChangelogGroup[];
}

const parts = (v: string) => v.split(/[.+-]/).map((n) => Number.parseInt(n, 10) || 0);
const newestFirst = (a: string, b: string) => {
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pb[i] ?? 0) - (pa[i] ?? 0);
  return 0;
};

// The packages are released together, so changesets' "Updated dependencies" bullets (and the
// sub-list of sibling versions under them) only repeat the version heading. Dropping them also lets
// packages with the same notes share one block.
const tidy = (notes: string) =>
  notes
    .replace(/^- Updated dependencies.*\n(?:[ \t]+.*(?:\n|$))*/gm, '')
    // a heading left with nothing under it
    .replace(/^### [^\n]+\n\s*(?=^### |(?![\s\S]))/gm, '')
    .trim();

export function getChangelog(): ChangelogRelease[] {
  // version → notes → packages
  const byVersion = new Map<string, Map<string, string[]>>();
  for (const source of Object.values(files)) {
    const name = /^# (.+)$/m.exec(source)?.[1]?.trim();
    if (!name) continue;
    const short = name.replace(/^@awesome-tour\//, '');
    for (const chunk of source.split(/^## /m).slice(1)) {
      const newline = chunk.indexOf('\n');
      const version = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
      const notes = tidy(newline === -1 ? '' : chunk.slice(newline + 1));
      if (!notes) continue;
      const groups = byVersion.get(version) ?? new Map<string, string[]>();
      groups.set(notes, [...(groups.get(notes) ?? []), short]);
      byVersion.set(version, groups);
    }
  }
  return [...byVersion.keys()].sort(newestFirst).map((version) => ({
    version,
    slug: `v${version.replace(/[^a-z0-9]+/gi, '-')}`,
    groups: [...byVersion.get(version)!].map(([notes, packages]) => ({
      packages: packages.sort(),
      // One level below the version heading (h2): changesets' "### Patch Changes" stays h3.
      html: marked.parse(notes, { async: false }),
    })),
  }));
}
