---

name: awesome-tour
description: The docs site as a flat-pack assembly manual. Paper, heavy black line art, one marker yellow for the part you act on.
colors:
paper: "#ffffff"
paper-2: "#f2f2ef"
ink: "#111111"
ink-2: "#4a4a47"
rule: "#d6d6d1"
marker: "#ffd23f"
marker-ink: "#111111"
dont: "#c8261d"
paper-dark: "#131312"
paper-2-dark: "#1d1d1b"
ink-dark: "#f1f1ec"
ink-2-dark: "#b9b9b1"
rule-dark: "#3a3a37"
dont-dark: "#ff6b5f"
tour-overlay: "rgb(17 17 17 / 0.62)"
tour-overlay-dark: "rgb(0 0 0 / 0.72)"
app-background: "#ffffff"
app-foreground: "#18181b"
app-muted: "#f4f4f5"
app-muted-foreground: "#63636b"
app-border: "#e4e4e7"
app-ring: "#a1a1aa"
app-sidebar: "#fafafa"
app-background-dark: "#18181b"
app-card-dark: "#1f1f23"
app-foreground-dark: "#fafafa"
app-muted-dark: "#27272a"
app-muted-foreground-dark: "#a1a1aa"
app-border-dark: "#33333a"
track-drums: "oklch(0.66 0.16 58)"
track-bass: "oklch(0.56 0.19 295)"
track-keys: "oklch(0.58 0.12 170)"
track-vox: "oklch(0.6 0.18 15)"
track-fx: "oklch(0.57 0.16 250)"
track-drums-dark: "oklch(0.8 0.14 70)"
track-bass-dark: "oklch(0.72 0.15 295)"
track-keys-dark: "oklch(0.76 0.12 170)"
track-vox-dark: "oklch(0.73 0.15 15)"
track-fx-dark: "oklch(0.74 0.12 250)"
typography:
display:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "clamp(3.1rem, 7.4vw, 5.9rem)"
fontWeight: 800
lineHeight: 0.9
letterSpacing: "-0.025em"
fontVariation: "'wdth' 116"
display-section:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "clamp(2.25rem, 4.4vw, 3.5rem)"
fontWeight: 800
lineHeight: 0.95
letterSpacing: "-0.025em"
fontVariation: "'wdth' 116"
display-page:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "3.25rem"
fontWeight: 800
lineHeight: 1.02
letterSpacing: "-0.025em"
fontVariation: "'wdth' 116"
numeral:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "5.5rem"
fontWeight: 900
lineHeight: 0.8
letterSpacing: "-0.02em"
fontFeature: "'tnum'"
fontVariation: "'wdth' 125"
headline:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "1.75rem"
fontWeight: 800
lineHeight: 1.15
letterSpacing: "-0.02em"
fontVariation: "'wdth' 112"
title:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "1.25rem"
fontWeight: 750
lineHeight: 1.25
letterSpacing: "-0.01em"
fontVariation: "'wdth' 108"
body:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "1.0625rem"
fontWeight: 400
lineHeight: 1.7
fontVariation: "'wdth' 100"
label:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "0.8125rem"
fontWeight: 750
lineHeight: 1.5
fontVariation: "'wdth' 112"
disc:
fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "0.8125rem"
fontWeight: 800
lineHeight: 1
fontVariation: "'wdth' 125"
code:
fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
fontSize: "0.8125rem"
fontWeight: 400
lineHeight: 1.65
fontFeature: "'liga' 0, 'calt' 0"
folio:
fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
fontSize: "0.6875rem"
fontWeight: 400
fontFeature: "'tnum'"
rounded:
none: "0px"
code: "3px"
sm: "4px"
md: "6px"
lg: "8px"
xl: "10px"
app: "8px"
full: "9999px"
spacing:
gutter: "16px"
gutter-md: "24px"
section: "64px"
section-md: "96px"
control-gap: "12px"
card: "16px"
container: "90rem"
prose: "56rem"
measure: "62ch"
components:
button-primary:
backgroundColor: "{colors.marker}"
textColor: "{colors.marker-ink}"
rounded: "{rounded.sm}"
padding: "0 20px"
height: "48px"
button-secondary:
backgroundColor: "{colors.paper}"
textColor: "{colors.ink}"
rounded: "{rounded.sm}"
padding: "0 20px"
height: "48px"
button-secondary-hover:
backgroundColor: "{colors.paper-2}"
button-primary-compact:
backgroundColor: "{colors.marker}"
textColor: "{colors.marker-ink}"
rounded: "{rounded.sm}"
padding: "0 14px"
height: "36px"
button-ghost:
textColor: "{colors.ink-2}"
rounded: "{rounded.sm}"
padding: "0 10px"
height: "36px"
nav-link-active:
backgroundColor: "{colors.marker}"
textColor: "{colors.marker-ink}"
rounded: "{rounded.sm}"
padding: "6px 10px"
part-disc:
backgroundColor: "{colors.ink}"
textColor: "{colors.paper}"
typography: "{typography.disc}"
rounded: "{rounded.full}"
size: "28px"
install-command:
backgroundColor: "{colors.paper}"
textColor: "{colors.ink}"
typography: "{typography.code}"
rounded: "{rounded.sm}"
height: "48px"
quantity-tag:
textColor: "{colors.ink}"
typography: "{typography.folio}"
rounded: "{rounded.sm}"
padding: "0 4px"
tab-selected:
backgroundColor: "{colors.paper}"
textColor: "{colors.ink}"
rounded: "{rounded.none}"
padding: "8px 14px"
aside-note:
backgroundColor: "{colors.paper}"
textColor: "{colors.ink}"
rounded: "{rounded.sm}"
padding: "14px 16px"
demo-frame:
backgroundColor: "{colors.paper-2}"
textColor: "{colors.ink}"
rounded: "{rounded.none}"
tour-card:
backgroundColor: "{colors.paper}"
textColor: "{colors.ink}"
rounded: "{rounded.xl}"
padding: "20px"
width: "min(22rem, calc(100vw - 2rem))"
---

# Design System: awesome-tour

## Overview

**Creative North Star: "The Assembly Manual"**

The site is a flat-pack assembly booklet for a headless library. Headless primitives are a parts inventory, and the reader assembles a tour by numbered steps. The world is built from three materials: white paper, heavy black line art at a constant 2px stroke, and one marker yellow that means "the part you act on". Red appears only to mark what not to do. Everything else is structure: lettered black discs that label parts, heavy expanded step numerals, dashed assembly arrows, quantity tags, a zoom-circle inset, and folio numbers on every page.

Density is printed-manual density: full-width 2px rules divide sections, content sits in tight grids, and the reading column stays calm. Headings, code, tables and callouts carry the world; running text does not compete with it. The world stops at the edge of the live demos. Inside them sits "your app", a neutral product UI on its own token scope, so the manual's line art always reads as the tour layer laid over the app and never as the app.

Rejected, per the direction contract: the SaaS template (centered gradient headline over three icon feature cards), the default Starlight look, dark neon or hacker styling, and spectacle that hurts reading.

**Key Characteristics:**

- Paper ground, ink line art at one stroke weight (2px), one marker yellow, red reserved for don'ts and cautions.
- Archivo variable in three width voices (100 body, 108–116 headings and display, 125 numerals and discs); JetBrains Mono for code, folios and package names only.
- Lettered part discs and `X·NN` folios as the navigation system.
- Square or nearly square corners (4px), no gradient surfaces, almost no shadow.
- A neutral `[data-app]` scope inside demos, so the tour is the only thing wearing the world.

## Colors

A monochrome print palette with a single highlighter and a single warning ink.

### Primary

- **Marker Yellow** (`marker`): the part you act on. Primary buttons, the current nav entry, the active tab's top bar, the code frame's active tab indicator, text selection, link underlines, search hits, the spotlight ring in the hero drawing, and a hovered link's fill. The same value in light and dark; text on it is always `marker-ink`.

### Tertiary

- **Don't Red** (`dont`, `dont-dark` in dark mode): the ✗ discs and struck-through text in the accessibility checks, and the border and disc of `caution` and `danger` asides. Maps to shadcn `--destructive`.

### Neutral

- **Paper** (`paper` / `paper-dark`): page ground, cards, code frames, the tour card.
- **Tinted Paper** (`paper-2` / `paper-2-dark`): alternating section bands, demo stages, hover fills, inline code, tab bars, progress tracks.
- **Ink** (`ink` / `ink-dark`): all text, all line art, part discs, the inverted "Fits the app" band, focus rings. Also shadcn `--border`, `--input` and `--ring`, so registry components draw in ink.
- **Pencil** (`ink-2` / `ink-2-dark`): secondary text, leads, captions, list markers, inactive nav.
- **Faint Rule** (`rule` / `rule-dark`): 1px row dividers, dashed hairlines (nav tree, step connectors, `hr`).
- **Tour Overlay** (`tour-overlay` / `tour-overlay-dark`): `--tour-overlay-color`, the dimming layer of a modal step.

### "Your app" neutrals (`[data-app]` scope)

- A zinc product palette (`app-*` tokens, light and dark) that overrides the shadcn tokens inside demo surfaces and the hero's drawn app: near-black primary buttons, pale grey muted fills, light grey borders, radius 0.5rem.
- **The app is Loopwork**, one specific, believable product: a beat-maker (`examples/loopwork`) with a transport bar, arrangement lanes, a 16-step sequencer, a mixer with rotary knobs, a virtualized sample browser and an effects dialog. Every demo, the playground and the hero drawing show a scene of it, with product copy (never copy that describes the API). Its character comes from the domain's geometry — lanes, steps, knobs, waveforms, a playhead, tabular timecode — not from a style of its own.
- **Track colors** (`--chart-1…5` inside `[data-app]`): drums amber, bass violet, keys teal, vox rose, effects blue, each ≥3:1 against the app background in both themes. They only mark channels and their clips, pads and knob arcs; never buttons or text.
- The registry's own default theme (`registry/src/styles/theme.css`, a violet oklch shadcn theme, radius 0.65rem) is the playground's neutral starting point and is **not** part of this site's world.

### Named Rules

**The One Marker Rule.** Yellow marks the single thing to act on in its context: the primary button, the current page, the active tab, the selected text. Never use it as a background band, a decoration or a second accent.

**The Red Means No Rule.** `dont` appears only on ✗ marks, struck-through anti-patterns, and caution or danger asides. Never on a button, link, or heading.

**The App Is Not The Manual Rule.** Anything that stands for the user's product goes inside `[data-app]` and uses only shadcn tokens. Ink, marker and line art belong to the tour layer and the docs chrome. A tour card rendered inside the app (in a modal dialog's top layer) still wears the world: `[data-app] [data-tour-top-layer]` restores the manual's tokens.

**The One Product Rule.** Demos are scenes of Loopwork, never a new mock app, a grid of labelled boxes, or a generic dashboard. A demo that needs something Loopwork doesn't have adds it to the kit.

## Typography

**Display Font:** Archivo Variable (width axis), with ui-sans-serif, system-ui
**Body Font:** Archivo Variable at normal width
**Label/Mono Font:** JetBrains Mono Variable, with ui-monospace

**Character:** One grotesque in three widths does all the speaking: normal for reading, expanded and heavy for titles, widest and blackest for numerals and part letters, like a manual's step numbers. Mono is a technical voice for code, package names, folios and quantity tags, with ligatures off so `=>` reads literally.

### Hierarchy

- **Display** (800, wdth 116, `clamp(3.1rem, 7.4vw, 5.9rem)`, line-height 0.9, -0.025em): the landing hero headline only. The `font-display` utility.
- **Display, section** (same voice, `clamp(2.25rem, 4.4vw, 3.5rem)`, 0.95): landing section titles; the closing line runs larger (`clamp(2.5rem, 6vw, 4.75rem)`, 0.92).
- **Display, page** (same voice, 2.25rem → 3.25rem at md, 1.02): docs page `h1`, set next to the folio numeral.
- **Numeral** (900, wdth 125, tabular, -0.02em): the `font-numeral` utility. Assembly step numbers (5.5rem, 0.8), the docs page number (3.25rem → 4.5rem, 0.82), the per-package `≤N kB` figures (text-xl).
- **Headline** (800, wdth 112, 1.75rem, 1.15): prose `h2`, always under a 2px ink top rule.
- **Title** (750, wdth 108, 1.25rem, 1.25): prose `h3`. Landing step titles use 700 at 1.5rem.
- **Body** (400, wdth 100, 1.0625rem, 1.7): the reading column, capped at 62ch. Landing leads run at 1.125–1.25rem, relaxed, in `ink-2`.
- **Label** (750, wdth 112, 0.8125rem): table headers. Nav group names and "On this page" use 700 at 0.8125rem, uppercase, wide tracking.
- **Disc** (800, wdth 125, 0.8125rem, line-height 1): the letter inside a part disc.
- **Code** (JetBrains Mono, 0.8125rem in frames, 0.86em inline): code, package names, install commands.
- **Folio** (JetBrains Mono, 0.6875rem, tabular): `B·04` page numbers, quantity tags, `Ctrl K`.

### Named Rules

**The Width Is The Voice Rule.** Hierarchy is carried by the width axis and weight of one family (wdth 100 / 108 / 112 / 116 / 125). Do not add a second display family.

**The Mono Is Literal Rule.** Mono only for things the reader types or reads as an identifier: code, package names, commands, folios, quantities. Never for prose or headings.

## Layout

- **Container:** max 90rem, centered, side gutters 16px (24px from md). Sticky header 64px tall, ink 2px bottom rule, paper at 85–95% with a small backdrop blur.
- **Landing:** full-bleed bands divided by 2px ink top rules, each with 64px (96px from md) vertical padding. Bands alternate paper, `paper-2`, and one inverted ink band ("Fits the app"). The hero is a two-column grid (0.92fr / 1.08fr from lg) with copy left and the exploded drawing right; it stacks on small screens. Assembly steps use a 7rem numeral column, a 0.8fr text column and a 1.2fr code column from md.
- **Docs:** a three-column booklet from xl (17rem contents | page | 14rem "On this page"), two columns from lg, and one column below lg, where the contents fold into a `details` bar headed by the group's part disc. The sidebars are sticky under the header; the left one has a 2px ink right rule.
- **Reading column:** prose max 56rem. Running text (p, lists, h2–h4, blockquote) is capped at 62ch; tables, code and demos use the full column. Block rhythm 1.15em; h2 gets 3.25rem above.
- **Breakpoints:** Tailwind defaults: sm 640, md 768, lg 1024, xl 1280.
- **The hero drawing** uses container-query units (`cqw`) for every position and size, so it scales as one illustration.

### Part-disc and folio numbering

- The docs are a booklet of five lettered sections: **A** Getting started, **B** Guides, **C** Components, **D** Registry, **E** API reference. Each section heading in the contents carries its part disc.
- Every page gets a folio `Letter·NN` (`B·04`), shown right-aligned in mono in the contents, as a huge `font-numeral` page number plus the mono folio in the page header, in the prev/next pager, and in the landing's "Fits" list.
- On the landing, discs letter the parts of the thing being assembled: the six packages (A–F, each with a quantity tag and a size bar), and the six tour parts in the hero drawing (A Overlay, B Content, C Arrow, D Progress, E Prev/Next, F Close), echoed by a parts strip below it. The workbench's option groups reuse those part letters.

### Named Rules

**The Folio Rule.** Every docs page has a folio, and the folio appears wherever the page is linked from the booklet (contents, pager, landing index).

## Elevation & Depth

Flat by default, drawn not lit. Depth comes from 2px ink outlines, `paper-2` bands, and the overlay dimming a modal tour step. Shadows exist only on things that float above the page: the tour UI and the search dialog. The "your app" window gets a soft product shadow, which is part of why it reads as a different material from the manual.

### Shadow Vocabulary

- **Floating part** (`0 18px 40px -18px rgb(0 0 0 / 0.35)`): registry tour card, hotspot card and checklist, as re-themed by the site.
- **Dialog** (`0 30px 60px -20px rgb(0 0 0 / 0.45)`): the search dialog, over a black 50% backdrop.
- **App window** (`0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.18)`): `AppSurface`, inside `[data-app]` only.
- **Arrow stroke** (`drop-shadow(0 2px 0 var(--ink))`): gives the tour card's arrow its ink line so it joins the 2px border.
- Code frames have no shadow (`frameBoxShadowCssValue: none`).

### Named Rules

**The Only Floating Things Rule.** A shadow means the element floats over the page: a tour step, a hotspot, a checklist, a dialog. Cards, frames, buttons and sections stay flat.

## Shapes

- **Line weight:** one structural stroke, `--line: 2px`, in ink. It draws section dividers, button and card outlines, demo frames, code frames, tab outlines, table head and foot rules, the h2 top rule, and the tour card border. A 1px stroke in `rule` is the secondary hairline (table rows, list dividers); 1px ink only for the blockquote bar.
- **Dashed line** means "fits here" or "goes next": the 28px dashed assembly arrow after each step numeral, dashed leaders on hero callouts, the dashed connector between `<Steps>` discs, the nav tree's dashed left border, the dashed `hr`, the dashed "sold separately" card, and the dashed outlines on exploded or ghosted parts.
- **Corners:** square to barely softened. 4px (`rounded-sm`) on buttons, inputs, cards, asides, nav links and tags; 0 on code frames and demo frames; 3px on inline code; 10px on the floating tour card. Inside `[data-app]` the radius is 0.5rem, so the app looks rounder than the manual.
- **Circles:** part discs (28px; 24px in nav and legends; 20px in the parts strip; 40px for `<Steps>`), ✓/✗ marks, and the zoom-circle inset.
- **Zoom-circle inset:** a 176px (208px at md) circle with a 2px ink border on `paper-2` and a faint radial vignette, showing a detail enlarged 1.9× with a lettered caption ("Part E, enlarged").

### Named Rules

**The One Stroke Rule.** Structural line art is 2px ink. Do not introduce 1px ink outlines or 3px borders on components.

## Components

### Buttons

Square, outlined and confident. Every docs-world button has a 2px ink border.

- **Shape:** gently squared corners (`rounded.sm`).
- **Primary:** marker yellow fill, `marker-ink` bold text, 2px ink border. 48px tall on the landing, 36px (`worldButton.primary`) in demos. Arrow or play icon trailing or leading.
- **Hover / Active:** primary lifts (-2px on landing, -1px in demos) and drops back on press. Secondary and outline fill with `paper-2`. Arrows nudge 2–4px in their direction.
- **Secondary:** paper fill, ink text, 600 weight, 2px ink border. `aria-pressed` inverts to ink fill with paper text.
- **Ghost:** no border, `ink-2` text, `paper-2` on hover. Header icon buttons are 36px squares in this style.
- **Focus:** 2px solid ink outline, 2px offset, site-wide.

### Chips

- **Quantity tag:** mono 11px, 2px ink border, 4px corners, no fill (`1×`, `0–1×`, `incl.`).
- **Version tag:** same construction in the header, `v0.1.0 · unreleased`, with the status in `ink-2`.

### Cards / Containers

- **Card / LinkCard:** 2px ink border, 4px corners, 16px padding, bold title, `ink-2` body. LinkCard fills marker yellow on hover, with its arrow nudging right.
- **Demo frame:** a figure with a 2px ink border and square corners. Caption bar has a small marker dot ringed in ink, a bold title and actions, then a 2px rule. The stage below is `paper-2` (12px, 20px from sm) holding the `[data-app]` surface. An optional footer note in `ink-2` sits under a 2px rule.
- **Asides:** 2px border, 4px corners, a 28px round icon disc. `note`: ink border, ink disc. `tip`: ink border, marker at 25% fill, marker disc. `caution` and `danger` (labelled "Don't"): `dont` border and disc.
- **Check rows:** a two-cell bordered row. The left cell has an ink ✓ disc and the "does" text. The right cell is `paper-2` with a `dont` ✗ disc and the anti-pattern struck through in `dont` at 60%.

### Inputs / Fields

- **Install command:** 48px bar, 2px ink border, 4px corners, a mono `$` prompt in `ink-2`, and a 48px copy cell behind a 2px left rule that fills marker on hover and swaps to a check icon on copy.
- **Search trigger:** 36px, 2px ink border, `ink-2` text, a `Ctrl K` kbd on `paper-2`. It opens a dialog with a 2px ink frame, a 56px borderless input over a 2px rule, and results where hover fills `paper-2`, focus fills marker, and matches are highlighted in marker.
- **Segmented choice (workbench):** a 2px ink outlined row of radio labels split by 2px rules. The checked option inverts to ink fill with paper text. Legend is led by a 24px part disc.

### Navigation

- **Header:** wordmark (an ink disc with a marker "A" stroke, plus the name in the display voice), then Docs / Registry / API at 15px 600 in `ink-2`. The current section gets a marker fill.
- **Contents (booklet index):** group headings with a 24px part disc, uppercase 13px bold. Links at 15px in `ink-2` with their folio right-aligned in mono. The current page fills marker yellow, 600 weight. The link list hangs off a dashed `rule` line.
- **On this page:** a list on a 2px ink left rule. The section being read turns ink and 600 weight.
- **Pager:** two 2px-outlined boxes with label and folio. "Previous" fills `paper-2` on hover, "Next" fills marker.
- **Tabs:** a 2px ink baseline. The selected tab is outlined in 2px ink, opens into the panel (paper bottom border) and carries a 4px marker bar on top (inset shadow). Expressive-code frames mirror this: square, 2px ink border, `paper-2` tab bar, 4px marker indicator on the active tab, github-light / github-dark syntax.

### Tables (parts list)

- 15px text. Header row in the label voice between two 2px ink rules. 1px `rule` row dividers, closed by a 2px ink rule on the last row. No fills, no vertical lines.

### Steps

- `<Steps>` turns an ordered list into assembly steps: 40px ink discs with a heavy wide numeral (900, wdth 125, 18px), joined by a 2px dashed `rule` connector, with content indented 60px.

### Tour UI (registry, site-themed)

The shadcn registry components wear the world through tokens alone: `--primary` is marker, `--border` and `--ring` are ink, `--radius` is 0.375rem. The site adds a 2px border on the tour card, hotspot card and checklist, the floating shadow, a heavy title (800, wdth 112, 18px), a 2px ink border on the Next button, an ink progress fill on a `paper-2` track, and ink active/complete dots. The overlay dims at `tour-overlay`. The spotlight is a 2px ring in `--primary` (marker), with a 6px marker halo at 20%.

### Hero assembly drawing (signature)

An exploded diagram of the six tour parts, lettered A–F with dashed leaders and mono names. It snaps together over a drawn `[data-app]` window, which sits at 30% opacity and greyscale while exploded. Assembled, it shows the overlay cutout and a marker spotlight ring on "New project". Hovering or focusing a parts-strip entry turns its disc marker yellow and rings the matching part in marker. While the page's real tour runs, the drawn parts ghost into dashed outlines, so only one tour is visible at a time.

### Motion

- **Snap:** parts travel 750ms on `cubic-bezier(0.22, 1, 0.36, 1)`, staggered 0–330ms, starting 1.4s after load. The landing tour starts once the snap settles.
- **State:** link fills 150ms ease-out; colors and opacity 200–500ms; spotlight and progress 300ms ease-out. Tour card enters with tw-animate-css fade plus zoom from 95% and a 2px slide away from its side.
- **Reduced motion:** the snap is instant (`motion-reduce:transition-none`, timers at 0), and the motion tour components fall back to instant transitions.

## Do's and Don'ts

### Do:

- **Do** draw every structural line at 2px ink (`--line`), and use 1px `rule` only as a secondary hairline.
- **Do** reserve marker yellow for the one thing to act on, and always set `marker-ink` text on it.
- **Do** label parts with lettered ink discs and give every docs page a `Letter·NN` folio.
- **Do** use dashed lines for "goes here / goes next": assembly arrows, leaders, connectors.
- **Do** wrap anything that stands for the user's product in `[data-app]` so it takes the neutral zinc tokens and 0.5rem radius.
- **Do** keep running text at 62ch, 1.0625rem / 1.7, and let headings, code and tables carry the world.
- **Do** theme the registry tour UI through shadcn tokens and `data-slot` selectors, never by forking its markup.
- **Do** keep both themes: dark swaps paper and ink and lightens `dont`, while marker stays the same yellow.

### Don't:

- **Don't** use a centered gradient headline over three icon feature cards, or gradient fills on surfaces; the only gradient is the faint radial vignette inside the zoom-circle inset.
- **Don't** reproduce the default Starlight look, or a dark neon / hacker palette.
- **Don't** add motion or spectacle to the reading column; the world lives in the landing drawing and the tour layer.
- **Don't** use red outside ✗ marks, struck-through anti-patterns and caution/danger asides.
- **Don't** put shadows on flat cards, frames, buttons or sections; only floating tour UI and dialogs get one.
- **Don't** style the demo app with ink, marker or 2px line art.
- **Don't** set prose or headings in mono, and don't enable code ligatures.

Divergence from the direction contract: the contract called for 2–3px strokes and red "only inside ✗ don't-panels". The build settled on a single 2px stroke (3px appears only in the logo glyph) and also uses red on `caution` asides. This file records the build.
