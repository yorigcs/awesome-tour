# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Front-end developers on SaaS product teams, working in React, who have to ship onboarding — product tours, hints, checklists — and have hit the limits of opinionated tour libraries (react-joyride, Shepherd, Intro.js, driver.js). They arrive at the docs **evaluating alternatives**: they want to see quickly whether the library survives real cases (multi-page flows, lazy targets, interactive steps, their own design system) before adopting it.

## Product Purpose

awesome-tour is an unstyled, accessible, composable toolkit for product tours and onboarding in React: a headless engine plus Radix-style compound components, with opt-in adapters (motion, react-three-fiber, routers, devtools) and a shadcn/ui registry of styled, copy-paste components. Success: a developer goes from "evaluating" to a working tour in their own app — in their own design system — without fighting the library.

## Positioning

All four are true together, and no single competitor can claim all of them:

- **Radix-level primitives.** Headless and composable (`asChild` everywhere, data attributes, CSS variables), accessible by construction: focus trap, `inert` background, focus restore, aria-live step announcements, keyboard navigation, reduced motion.
- **MIT, no catch.** Permissive license, versus tour-kit (BUSL) and Shepherd / Intro.js (AGPL / commercial).
- **3D targets.** Tours can point at objects inside react-three-fiber scenes (`@awesome-tour/three`), with camera shots per step.
- **A complete engine, all opt-in.** Multi-page tours via router adapters (React Router, Next.js, TanStack), branching and conditional steps, interactive steps (`advanceOn`), waiting for lazy targets, persistence, analytics, multiple tours with a priority queue, checklists, hotspots, devtools.

## Operating Context

- pnpm monorepo: `@awesome-tour/{core,react,motion,three,router,devtools}` + private `registry/` (shadcn registry) + `apps/docs` (custom Astro site: MDX content, Pagefind search, expressive-code; deployed to GitHub Pages under `/awesome-tour`) + `apps/playground` (Vite app used for e2e).
- Evaluation happens in the browser: live demos on the docs pages, source viewable next to each demo, then `npx shadcn add @awesome-tour/<item>` or `pnpm add @awesome-tour/react`.
- Live demos are also the e2e and axe test surface (Playwright).

## Capabilities and Constraints

- React 18/19; Tailwind v4 + shadcn tokens for the registry and the docs demos; the library packages themselves ship no CSS.
- Docs are a custom Astro 7 site (own layout, booklet-style navigation, Pagefind search, MDX); demos are React islands.
- Bundle budgets enforced by size-limit (core 9 kB, react 18 kB, motion 4 kB, three 3 kB, devtools 6 kB, router 1 kB).
- Open: roadmap features (eligibility rules, announcements, surveys, i18n…) are planned, not shipped — never present them as available.

## Brand Commitments

- Name: **awesome-tour**, lowercase. Package scope `@awesome-tour/*`.
- Library code and docs are written in English.

## Evidence on Hand

- Real: the working library, its live demos, the playground, the source, test suites (Vitest + Playwright + axe), measured bundle budgets (`.size-limit.json`).
- Absent — must not be fabricated: users, customer logos, testimonials, GitHub stars, download counts, benchmarks against competitors, a published npm release (v0.1.0 is unpublished).

## Product Principles

1. **Show, don't claim.** Every capability on the site is proven by a live, working demo with its real source one click away.
2. **The developer owns the UI.** Nothing to override; styled pieces are copied into their codebase.
3. **Accessible by default, not by configuration.**
4. **Everything opt-in.** The core stays small; adapters add power only when imported.
5. **Honest about status.** Shipped vs planned is always clear.

## Accessibility & Inclusion

WCAG 2.2 AA for the docs and every demo (enforced with axe in e2e, light and dark themes); full keyboard operation; `prefers-reduced-motion` respected.
