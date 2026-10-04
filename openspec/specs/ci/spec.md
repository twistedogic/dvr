# ci - CI test workflow

## Purpose

`dvr`'s continuous-integration workflow runs the project's test suite
on every push to `main` and on every pull request, and reports
pass/fail to GitHub so a broken test cannot land unnoticed.

## Requirements

### Requirement: Tests run on every push to main

The system SHALL include a GitHub Actions workflow that runs the test
suite (`node --test scripts/ site/`) on every push to the `main`
branch and on every pull request targeting `main`. The workflow SHALL
report pass/fail as the GitHub check status for the commit.

#### Scenario: Push to main triggers tests
- **WHEN** a commit is pushed to the `main` branch
- **THEN** GitHub Actions runs the test job and the commit's check
  status reflects the result.

#### Scenario: Pull request triggers tests
- **WHEN** a pull request is opened or updated against `main`
- **THEN** GitHub Actions runs the test job before the PR is mergeable
  and the PR shows a green check or red X accordingly.

### Requirement: No deploy, no schedule, no secrets

The CI workflow SHALL NOT deploy the site, run on a schedule, write
secrets to the repo, or perform any action beyond running the test
suite. Site deployment is handled by GitHub Pages natively, and the
catalog is built by hand on the developer's machine.

#### Scenario: Workflow only runs on push and pull_request
- **WHEN** the workflow file is inspected
- **THEN** its `on:` trigger contains only `push` (to `main`) and
  `pull_request` (against `main`); no `schedule`, no `workflow_dispatch`,
  no other triggers.

#### Scenario: Workflow uses no secrets
- **WHEN** the workflow file is inspected
- **THEN** it references no `${{ secrets.* }}` expressions and
  declares no `permissions:` block beyond the implicit `contents: read`
  needed by `actions/checkout`.
