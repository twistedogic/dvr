# Repository Guidelines

This repository follows a spec-driven workflow managed by the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI. All changes flow through artifacts in `openspec/` before any work is implemented.

## Project Structure & Module Organization

- `openspec/config.yaml` — OpenSpec schema (`spec-driven`) and per-artifact rules. Update `context`, `rules`, and `operations` here to steer AI-authored artifacts.
- `openspec/specs/` — Authoritative capability specs. Each capability lives in its own subdirectory (e.g. `specs/user-auth/spec.md`) with `## Purpose` and `## Requirements` sections using `### Requirement:` / `#### Scenario:` blocks.
- `openspec/changes/` — In-flight changes. Each folder holds `proposal.md`, `design.md`, `tasks.md`, and a delta spec at `specs/<capability>/spec.md`.
- `openspec/changes/archive/` — Completed changes (read-only; populate via `openspec archive`).
- `.pi/skills/`, `.pi/prompts/` — OpenSpec agent skills and slash-command prompts.
- `.agents/`, `.codex/` — Reserved for agent tooling; leave untouched unless extending it.

## Build, Test, and Development Commands

Run from the repo root using the OpenSpec CLI:

- `openspec list --json` — Discover project root and registered changes/specs.
- `openspec new change "<name>"` — Scaffold a new change folder.
- `openspec status --change "<name>" --json` — Inspect artifact completion.
- `openspec validate --change "<name>" --strict` — Validate a single change (the project's primary "test").
- `openspec validate --strict` — Validate every spec under `openspec/specs/`.
- `openspec sync specs --change "<name>"` — Merge approved deltas into main specs.
- `openspec archive --change "<name>"` — Move a deployed change to `archive/`.

## Coding Style & Naming Conventions

- **YAML** in `openspec/config.yaml` — 2-space indent, lowercase keys, block scalars for multi-line `context:` / `guidance:` text.
- **Capability names** — lowercase, hyphenated (e.g. `billing`, `identity/sso`).
- **Change names** — short verb phrases, lowercase, hyphenated (e.g. `add-invoice-export`).
- **Markdown specs** — ATX headings; every `### Requirement:` followed by at least one `#### Scenario:` with `WHEN ... THEN ...` clauses.
- Keep proposals under 500 words; break tasks into 1–2 hour chunks (see `openspec/config.yaml` rules).

## Testing Guidelines

There is no runtime code in this repo. "Tests" are OpenSpec validations:

- Run `openspec validate --strict` before opening a PR; the command must exit zero.
- Every `### Requirement` must include at least one Scenario with a deterministic `THEN` outcome.
- Name scenarios by behavior, not implementation (e.g. `#### Scenario: token expires after 1 hour`).

## TDD for Implementation

When implementing the tasks in `openspec/changes/<name>/tasks.md`, follow red-green-refactor:

1. Write the failing test first; run it and confirm it goes _red_ before touching production code.
2. Write the minimum production code that turns it _green_.
3. Refactor with tests green; keep the cases, remove the dead weight.

Completion criterion: every task item in `tasks.md` ships with a passing test, and `openspec validate --strict` still exits zero. For language-specific frameworks, naming, and commands, defer to the downstream project's tooling and the `tdd` skill in this agent's skill list.

## Commit & Pull Request Guidelines

- Commit subjects use the change name as a prefix when applicable (e.g. `add-invoice-export: scaffold proposal`).
- One change per PR; reference the change folder in the PR title.
- PR description must include a summary, the linked change path (`openspec/changes/<name>/`), and the `openspec validate` exit status.
- Do not edit files inside `openspec/changes/archive/` directly; use the CLI.

## Agent-Specific Instructions

Prefer the bundled skills in `.pi/skills/` (`openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`, `openspec-archive-change`). Treat `openspec/config.yaml` rules as authoritative; planning workflows must not edit project code outside approved change folders.
