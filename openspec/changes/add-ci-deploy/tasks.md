# Tasks

## 1. Workflow file

- [x] 1.1 Add a `deploy` job to `.github/workflows/test.yml` that depends on `test`, is gated by `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`, declares `permissions: { pages: write, id-token: write }`, targets the `github-pages` environment, uploads `site/` via `actions/upload-pages-artifact@v3`, and deploys via `actions/deploy-pages@v4`; verify the file still parses with `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))"`
- [x] 1.2 Verify the deploy job references no `${{ secrets.* }}` expressions and the only `permissions:` block in the file is on the `deploy` job with `pages: write` and `id-token: write` only
- [x] 1.3 Verify the `test` job is unchanged from the previous commit (only a new `deploy` block was added)

## 2. Update prior change artifacts

- [x] 2.1 Update `openspec/changes/add-dvr-pwa/proposal.md` to note the deploy mechanism is now "GitHub Actions" instead of "branch /site"
- [x] 2.2 Update `openspec/changes/add-dvr-pwa/design.md` section D8 (Deployment) to describe the `deploy` job and the one-time Pages source change
- [x] 2.3 Update `openspec/changes/add-dvr-pwa/tasks.md` task 10.2 to reflect the new source setting ("GitHub Actions" instead of "main / /site")

## 3. Commit and push

- [x] 3.1 Commit the workflow change and the prior-artifact updates in one commit
- [x] 3.2 Push to `origin main` and verify `git status` shows the branch is up to date
- [x] 3.3 Pages enabled on the repo: `gh api repos/twistedogic/dvr/pages` returns `build_type: "workflow"` and `html_url: https://twistedogic.github.io/dvr/`

## 4. Re-run robustness fix

- [x] 4.1 Add a pre-upload step in the `deploy` job that deletes any existing `github-pages` artifact in the same workflow run via `actions/github-script@v7` (re-runs of the failed deploy job were leaving duplicate artifacts)
- [x] 4.2 Add `actions: write` to the deploy job's `permissions:` block (required by `actions/github-script` to delete artifacts)
- [x] 4.3 Delete the two stale `github-pages` artifacts on run 37172008628 via `gh api -X DELETE` so the next run starts clean
- [x] 4.4 Update design.md "Risks / Trade-offs" to document the duplicate-artifact failure mode and the mitigation
- [ ] 4.5 Push the workflow fix; observe the next run deploy successfully
