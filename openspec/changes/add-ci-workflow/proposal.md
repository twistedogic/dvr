# Proposal

## Why

The `dvr` PWA's tests (`node --test scripts/ site/`) currently run only
on the developer's machine. A pull request can land code that breaks the
catalog parser or the state module without any signal. A GitHub Actions
workflow that runs the test suite on every push and pull request gives
the project a green/red light without adding any runtime cost.

## What Changes

- Add `.github/workflows/test.yml`: a single job that checks out the
  repo, sets up Node 20, and runs `node --test scripts/ site/`. Triggers
  on push to `main` and on every pull request.
- No changes to the catalog build script, the PWA, the service
  worker, or the deploy flow. GitHub Pages still deploys directly from
  the `main` branch with no action involvement.
- No scheduling. No auto-refresh of the catalog. Those were explicitly
  out of scope for `dvr` and remain so.

## Capabilities

### New Capabilities

- `ci`: The GitHub Actions workflow that runs the project's test suite
  on every push to `main` and on every pull request, and reports
  pass/fail back to GitHub.

### Modified Capabilities

None.

## Impact

- One new file: `.github/workflows/test.yml` (~15 lines).
- No new runtime dependencies, no secrets, no permissions beyond the
  default `contents: read` granted to `actions/checkout`.
- Failure mode: if the workflow is broken or the tests regress, the PR
  shows a red X. This is desirable.
- The workflow is independent of the `dvr` capability - it exercises
  the same test files but does not change dvr's behavior.
