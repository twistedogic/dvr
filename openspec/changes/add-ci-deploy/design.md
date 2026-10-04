# Design

## Context

`dvr`'s `add-dvr-pwa` design originally said GitHub Pages deploys
from the `main` branch's `/site` directory natively, with no
GitHub Actions involvement. The `add-ci-workflow` change added a
test job on push and PR, but the deploy was still un-gated: a
failing test could land on `main` and the broken site would be
live within a minute. This change moves publishing to a CI job.

The spec fixes what the deploy must do (gate on tests, target the
`github-pages` environment, request only the needed permissions).
This document fixes how it is wired.

## Goals / Non-Goals

**Goals:**
- Reuse the existing `test` job. Do not duplicate the checkout or
  Node setup.
- Two jobs total: `test` (on push and PR) and `deploy` (on push to
  `main` only, after `test`).
- Use the official `actions/upload-pages-artifact` and
  `actions/deploy-pages` actions. Do not roll a custom deploy step.
- No secrets, no PATs, no SSH keys. The `GITHUB_TOKEN` provided by
  the Actions runner is enough.

**Non-Goals:**
- No previews for pull requests (would need a second environment
  per PR; out of scope for v1).
- No scheduled catalog refresh (still runs by hand on the developer's
  machine; explicit non-goal of `dvr`).
- No caching, no matrix, no conditional logic beyond
  `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`.
- No environment-level approval gates. The default `github-pages`
  environment is fine; the user can add a required reviewer later
  via the repo Settings UI if they want one.

## Decisions

### D1. Two jobs, `deploy` after `test`

**Decision:** Add a `deploy` job alongside the existing `test` job.
`deploy.needs = test`, so it only runs when `test` succeeds.
`deploy.if` is the standard
`github.event_name == 'push' && github.ref == 'refs/heads/main'`
guard so PRs never trigger it.

**Why:** `needs:` is the documented way to express "this job depends
on that one." The `if:` guard is the documented way to scope a job
to a single branch + event combination. Using both gives a clean
green/red signal: `test` failure -> red, no deploy; `test` pass on
main -> green, deploy runs; `test` pass on PR -> green, no deploy.

**Alternatives considered:** A single `build-and-deploy` job that
runs tests inline (loses the "no deploy on PR" property without
extra logic). An `actions/github-script` deploy step (more code,
same outcome).

### D2. `actions/upload-pages-artifact` + `actions/deploy-pages`

**Decision:** Use the official pair
(`actions/upload-pages-artifact@v3` to zip and upload `site/`,
`actions/deploy-pages@v4` to publish). Pin to major versions.

**Why:** This is the path GitHub documents and supports. The
artifact is a clean contract between the upload and the deploy step,
and the deploy step is the only thing that needs the
`pages: write` and `id-token: write` permissions - the test job
needs neither.

**Alternatives considered:** `peaceiris/actions-gh-pages` (pushes to
a `gh-pages` branch; older, requires a PAT or SSH key, and Pages
would need to be reconfigured to serve from that branch). A custom
script (reinvents the wheel).

### D3. `github-pages` environment, default settings

**Decision:** Target the `github-pages` environment with no
required reviewers. The user can add an approval gate in
Settings -> Environments later.

**Why:** Pinning the deploy to an environment is what makes the
`pages: write` permission safe - it limits the scope of the
`GITHUB_TOKEN` to that environment. Adding a required reviewer is
a separate concern and not the workflow's job to enforce.

### D4. `path: ./site`

**Decision:** `actions/upload-pages-artifact` is given `path: ./site`.
It zips the directory and ships it as the Pages artifact.

**Why:** `site/` is the directory the rest of `dvr`'s design treats
as "what GitHub Pages serves." Keeping that single source of truth
means the local `python3 -m http.server site/` test, the eventual
deploy, and any future cache/CDN changes all look at the same
directory.

## Risks / Trade-offs

- **First deploy requires a one-time repo setting change.** Pages
  must be reconfigured from "Deploy from a branch" to "GitHub
  Actions." Until that change is made, the next push will run the
  workflow but the deploy step will fail with a clear error. The
  maintainer sees the error and fixes the setting.
- **No PR previews.** A PR is built and tested but not deployed.
  → Mitigation: the test job still runs on PRs and gates the merge
  via the GitHub branch-protection setting (which the user can
  enable in repo Settings). Adding real previews is a future change.
- **Stuck deploys.** If a deploy step fails mid-flight, the next
  push can re-run it. No state is held between runs.
- **The `GITHUB_TOKEN` for the deploy step is scoped to the
  `github-pages` environment** for the `pages: write` and
  `id-token: write` permissions, not for the whole repo. This is
  the safer default.

## Migration Plan

1. Update `.github/workflows/test.yml` to add the `deploy` job.
2. Push to `main`.
3. In repo Settings -> Pages, change Source from "Deploy from a
   branch" (Branch: `main`, Folder: `/site`) to "GitHub Actions."
4. Re-run the latest workflow (or push again). The deploy job
   publishes the site.
5. The published URL is `https://<owner>.github.io/dvr/`.

Rollback: revert the workflow change, or re-set Pages source to
"Deploy from a branch" and choose `main` / `/site`. Either way, the
previously published version of the site stays up until the next
deploy lands.

## Open Questions

None. The first-deploy-requires-settings-change gotcha is captured
in Migration Plan, not Open Questions, because it is a one-time
action item, not a deferred design call.
