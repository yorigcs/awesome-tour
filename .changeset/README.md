# Changesets

Every PR that changes a published package adds a changeset: `pnpm changeset`, pick the packages,
the bump (patch / minor / major) and a one-line summary for the changelog. CI fails PRs that touch
`packages/` without one (`pnpm changeset --empty` for changes that don't need a release note).
