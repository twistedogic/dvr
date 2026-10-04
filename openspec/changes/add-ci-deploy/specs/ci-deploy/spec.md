# Spec Delta

## Purpose

`dvr`'s CI deploy job publishes the static `site/` directory to
GitHub Pages on every push to `main` after the test job passes,
turning the test suite into a deploy gate.

## ADDED Requirements

### Requirement: Deploy after tests pass on main

The CI workflow SHALL include a `deploy` job that runs only on push
to the `main` branch (not on pull requests) and only after the `test`
job has succeeded. The deploy job SHALL upload the `site/` directory
as a GitHub Pages artifact and SHALL deploy it via
`actions/deploy-pages`. A failing test SHALL block the deploy.

#### Scenario: Push to main with passing tests deploys the site
- **WHEN** a commit is pushed to `main` and the `test` job passes
- **THEN** the `deploy` job runs, uploads `site/`, and publishes it
  to GitHub Pages; the published URL becomes the artifact of this
  workflow run.

#### Scenario: Push to main with failing tests skips deploy
- **WHEN** a commit is pushed to `main` and the `test` job fails
- **THEN** the `deploy` job does not run and the previously published
  site is left in place; the workflow run shows a red X on the
  failing `test` job and `deploy` is reported as "skipped."

#### Scenario: Pull request never deploys
- **WHEN** a pull request is opened or updated
- **THEN** the `deploy` job does not run, regardless of whether
  `test` passes; only `test` runs on pull requests.

### Requirement: Deploy uses the github-pages environment

The `deploy` job SHALL target the `github-pages` environment and
SHALL request the `pages: write` and `id-token: write` permissions
required by `actions/deploy-pages`. No other permissions SHALL be
requested and no secrets SHALL be referenced.

#### Scenario: Deploy job requests only the needed permissions
- **WHEN** the workflow file is inspected
- **THEN** the `deploy` job declares `permissions:` with
  `pages: write` and `id-token: write` only, and references no
  `${{ secrets.* }}` expressions.

#### Scenario: Deploy targets the github-pages environment
- **WHEN** the workflow file is inspected
- **THEN** the `deploy` job includes
  `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`.
