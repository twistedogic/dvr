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

- [ ] 3.1 Commit the workflow change and the prior-artifact updates in one commit
- [ ] 3.2 Push to `origin main` and verify `git status` shows the branch is up to date
- [ ] 3.3 (User) In GitHub repo Settings -> Pages, change Source to "GitHub Actions" so the first deploy job can publish
