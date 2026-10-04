# Tasks

## 1. Workflow file

- [x] 1.1 Add `.github/workflows/test.yml` with a single `test` job that checks out the repo, sets up Node 20, and runs `node --test scripts/ site/`; trigger on push to `main` and on pull_request; verify the file parses with `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))"`
- [x] 1.2 Verify the workflow file references no `${{ secrets.* }}` and no `permissions:` block, and that the `on:` trigger contains only `push` (to `main`) and `pull_request` against `main`
- [x] 1.3 Commit the workflow file with the existing change name and verify with `git log -1 --oneline`

## 2. Local sanity check

- [x] 2.1 Run the same test command the workflow runs (`node --test scripts/ site/`) locally and verify it exits 0 and reports 10 passing tests
