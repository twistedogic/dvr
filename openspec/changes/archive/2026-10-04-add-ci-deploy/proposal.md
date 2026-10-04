# Proposal

## Why

The `add-dvr-pwa` design originally said GitHub Pages deploys directly
from the `main` branch's `/site` directory, with no GitHub Actions
involvement. That works, but every push becomes a deploy with no
gate. A failing test can land on `main` and the broken site is live
within a minute. The `add-ci-workflow` change added tests on PRs, but
a PR can still be merged with a red check, and the deploy still
happens un-gated.

This change moves publishing to a dedicated `deploy` job that runs
only on push to `main`, only after the `test` job passes, and uses
the official `actions/deploy-pages` flow. The result: tests are the
gate, deploy is a CI artifact, and the previous "branch source"
Pages setting is replaced with "GitHub Actions" as the source.

## What Changes

- Extend `.github/workflows/test.yml` with a second `deploy` job that
  uploads `site/` as a Pages artifact and deploys it via
  `actions/deploy-pages@v4`. The job depends on `test`, runs only on
  push to `main`, and uses the `github-pages` environment for
  protection.
- Update `add-dvr-pwa`'s proposal and design to reflect the new
  deploy mechanism (GitHub Actions instead of "branch /site").
- Update `add-dvr-pwa`'s deploy task list: Settings -> Pages now
  picks "GitHub Actions" as the source, not "branch /site".

## Capabilities

### New Capabilities

- `ci-deploy`: The deploy job that publishes `site/` to GitHub Pages
  on every push to `main`, after the test job passes. The site is
  uploaded as a Pages artifact and deployed via `actions/deploy-pages`.

### Modified Capabilities

None. The `ci` capability (in the still-open `add-ci-workflow`
change) is not modified - that change's spec covers only tests, not
deploy. This change is a separate capability.

## Impact

- One file modified: `.github/workflows/test.yml` (a second `deploy`
  job is added; the existing `test` job is unchanged).
- GitHub repository setting: Pages source changes from "Deploy from a
  branch" (Branch: `main`, Folder: `/site`) to "GitHub Actions." This
  is a one-time change in the repo Settings UI by the maintainer.
- The first deploy creates a `github-pages` environment. Subsequent
  deploys are gated by it.
- The local catalog build (run by hand, commit `site/catalog.json`)
  is unchanged. CI deploys whatever is in `site/` at the commit.
- Failure mode: a failing test blocks the deploy. A deploy that fails
  after the artifact upload shows a red X on the `main` commit but
  leaves the previously published site untouched.
