# Design

## Context

The `dvr` PWA has unit tests for the build script and the state
module (`node --test scripts/ site/`). They run only on the
developer's machine today. The proposal fixes the need for an
external signal: a green/red light on every push and PR. The spec
fixes what that signal must include (tests run, no deploy/schedule,
no secrets). This document fixes how the workflow file is structured.

## Goals / Non-Goals

**Goals:**
- One workflow file, one job, one step that runs the test suite.
- No caching, no matrix builds, no conditional logic. The simplest
  thing that works.
- Triggers on push to `main` and on pull_request. Nothing else.
- Fails the check if any test fails or if `node --test` exits non-zero.

**Non-Goals:**
- No schedule (cron) - the catalog is refreshed by hand.
- No deploy step - GitHub Pages handles deployment natively.
- No code coverage, no lint, no prettier - out of scope.
- No matrix across Node versions - the project pins Node 20+ in its
  tests; running on a single LTS is enough.
- No branch protection rules - the user can add those in GitHub UI if
  desired; not part of this change.

## Decisions

### D1. One job, one step, one command

**Decision:** The workflow has a single `test` job that runs
`actions/checkout@v4`, `actions/setup-node@v4` (Node 20), and
`node --test scripts/ site/`. Nothing else.

**Why:** The whole test suite is ~1 second. Splitting it into
build/test/deploy jobs, adding cache, or running on multiple OSes
adds minutes and noise without changing the answer. Ponytail.

**Alternatives considered:** A build job and a separate test job
(overkill for a 1-second suite). A matrix across ubuntu/macos/windows
(the PWA is platform-agnostic; the test suite is pure Node).

### D2. Pin action versions to majors

**Decision:** Use `actions/checkout@v4` and `actions/setup-node@v4`.
Major-version pinning means GitHub picks up patch updates without the
workflow file changing, but a major-version bump (e.g. v5) requires
an explicit edit.

**Why:** SHA-pinning is more secure but adds maintenance burden for a
project this small. Tag-pinning to `@v4` is the standard middle ground
for non-security-critical workflows.

**Alternatives considered:** Pinning to commit SHAs (rejected - too
much ceremony for this size of project). Tracking `main` (rejected -
unpredictable).

### D3. Node 20

**Decision:** `node-version: '20'`. The project uses only built-in
Node APIs (`node:test`, `node:fs/promises`, `node:https`); it works
on Node 18+ but Node 20 is the current LTS at time of writing and is
the version in the local dev environment.

**Why:** Matches the local dev environment so a "passes locally, fails
in CI" mismatch does not happen.

**Alternatives considered:** Node 18 (older LTS; would work but
forces parity to an older runtime). Node 22 (newer; less likely to be
the user's local version).

## Risks / Trade-offs

- **Workflow can be skipped on forks.** GitHub does not run workflows
  on PRs from forks unless "Run workflows from fork PRs" is enabled in
  repo settings. This is GitHub's default security stance.
  → Mitigation: the maintainer can enable that setting, or just
  re-run the workflow after pushing a fix. Not blocking.
- **No version bump signal.** A major Node release would not be
  flagged by CI; the workflow would just keep running on Node 20.
  → Mitigation: trivial to update `node-version` when desired; not
  the workflow's job to track Node releases.
- **`node --test` exits non-zero on any test failure.** This is the
  documented behavior. The workflow relies on it implicitly.

## Migration Plan

Add `.github/workflows/test.yml`. Commit. Push. The next push to
`main` and the next PR will run the workflow automatically.

Rollback: delete the file. No other code depends on the workflow.

## Open Questions

None.
