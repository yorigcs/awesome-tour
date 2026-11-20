# Releasing

## How it works

```
PR ──► CI (lint · types · unit on Node 22/24/26 · build + size + publint/attw · e2e · shadcn smoke · docs)
 │      └─ PRs must carry a changeset (`pnpm changeset`)
 ▼
main ──► CI ──(green)──► Release workflow
                           ├─ pending changesets → opens/updates "chore: release packages" PR
                           └─ that PR merged     → pnpm build + changeset publish (npm, OIDC + provenance)
                                                    → git tags + GitHub releases
                                                    → Docs workflow → GitHub Pages (site + shadcn registry)
```

- **Versions** come from changesets. Each PR that changes a published package adds one
  (`pnpm changeset`); the release PR collects them into versions and `CHANGELOG.md`s.
- **Publishing** uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers): the
  workflow exchanges a GitHub OIDC token for a one-off npm credential. There is no npm token in
  the repository. Provenance is attached automatically (public repo + public package).
- **Docs and registry** deploy only after a publish, so the site documents — and `shadcn add`
  installs — exactly what is on npm. Registry items pin `@awesome-tour/*@^<released version>`.
  For a docs-only fix, run **Docs** by hand (_Actions → Docs → Run workflow_) with the latest
  release tag as `ref`.
- **Release gating**: Release runs only when CI on `main` succeeded (`workflow_run`), in the
  `npm` environment — add required reviewers there to approve every publish.

## One-time setup

### 1. npm organization

Create the **`awesome-tour`** organization on npmjs.com (free for public packages), with
two-factor authentication on your account.

### 2. First publish (bootstrap)

npm can only configure a trusted publisher on a package that already exists, so the very first
version of each package is published from your machine:

```sh
npm login                         # an owner of the awesome-tour org
pnpm install && pnpm build
pnpm check:packages               # publint + attw
pnpm changeset publish            # publishes every package at 0.1.0 and tags the commit
git push --follow-tags
```

(Alternatively, npm's staged publishing — `npm stage publish` — then promote each package on
npmjs.com.)

### 3. Trusted publishers

For **each** package (`@awesome-tour/core`, `react`, `motion`, `three`, `router`, `devtools`,
`testing`, `codemod`, `elements`), on npmjs.com → package → _Settings → Trusted publishing_:

| Field        | Value          |
| ------------ | -------------- |
| Provider     | GitHub Actions |
| Organization | `yorigcs`      |
| Repository   | `awesome-tour` |
| Workflow     | `release.yml`  |
| Environment  | `npm`          |

Then, under _Publishing access_, choose **"Require two-factor authentication and disallow
tokens"**: from now on only this workflow can publish. A new trusted-publisher configuration has
to be used by a successful publish within a couple of days, or it must be re-created.

### 4. GitHub repository settings

- **Pages**: _Settings → Pages → Source: GitHub Actions_.
- **Environments**: create `npm` (optionally with required reviewers and `main` as the only
  deployment branch) and keep `github-pages` restricted to `main` and tags.
- **Branch protection** on `main`: require a PR, and these checks: _Lint, types & changeset_,
  _Unit tests (Node 22/24/26)_, _Build, size & package checks_, _End-to-end_,
  _Registry (shadcn add)_, _Docs build_.
- **Actions → General → Workflow permissions**: allow GitHub Actions to create pull requests
  (for the release PR).

> The release PR is opened with the workflow's `GITHUB_TOKEN`, and GitHub doesn't run workflows
> for events created by that token. If the required checks above block merging it, either merge
> it as an admin after a quick look (it only bumps versions and changelogs — CI runs again on
> `main` before anything is published), or give the Release workflow a GitHub App token.

## Day to day

```sh
pnpm changeset          # describe your change (patch / minor / major)
git commit -am "feat: …" && git push   # open the PR
```

Merge PRs as usual. When you want to ship, merge the **chore: release packages** PR.
