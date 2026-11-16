---

version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/layouts/DocsLayout.astro"]
---

# Docs site + landing (apps/docs)

Scope: the whole docs site, fully custom (Starlight removed): landing (Persuade) and every docs page (Read), plus the live demos inside them. Audience: React front-end devs at SaaS teams evaluating tour libraries. Job: see the library survive real cases, then install. Proof: live demos with real source only; no invented users, stars or benchmarks; v0.1.0 is unreleased. Anti-references: SaaS template (gradient hero, icon feature cards), default Starlight look, dark neon/hacker, spectacle that hurts reading.

Memorable moment: the hero's exploded tour UI snaps together into a working tour, which then runs over the page; below, a workbench where the visitor rebuilds the tour and watches the code change.

## Direction contract

THESIS: Headless primitives are a parts inventory; you assemble the tour by numbered steps. Refuses the centered gradient headline over three feature cards.

OWN-WORLD: Flat-pack assembly booklet. Paper white ground, black heavy line art (2–3px strokes), one marker yellow reserved for "the part you act on", red only inside ✗ don't-panels. Black discs with white letters label parts; big heavy step numerals; dashed assembly arrows; quantity tags (1×, n×); zoom-circle insets for details. Archivo (expanded heavy for numerals and titles), JetBrains Mono for code only.

STORY: The visitor sees the parts, watches them assemble into a running tour, rebuilds it on the workbench, reads the steps to install, finds the API in a booklet-style docs set.

FIRST VIEWPORT: Left, "Assemble your own tour." at ~5.5rem, one line of subcopy, install command with copy (primary) and "Assemble" (runs the snap + tour). Right, the exploded diagram of the real tour parts with lettered callouts A–F naming Tour.Overlay, Tour.Content, Tour.Arrow, Tour.Progress, Tour.Prev/Next, Tour.Close; under it a parts strip. Header: wordmark, Docs, Registry, API, GitHub, "v0.1.0 · unreleased".

FORM: Assembly Manual, grounded list position 1 (IMPECCABLE'S PICK, chosen over the rolled position 5). seed:729cd3c270b10fa4

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
