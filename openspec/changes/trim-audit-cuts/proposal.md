# Proposal

## Why

A whole-repo `ponytail-audit` pass found ~57 lines of over-engineered
or dead code across the PWA, plus a correctness bug that one of the
cuts is the prerequisite for fixing. The cuts fall into three
buckets: dead exports, untested helpers inlined into their single
caller, and a redundant defensive try/catch. None of them are
covered by tests, so the cuts can land without test changes.

The correctness bug is a bonus: `loadTalk()` returns the YT.Player
handle, but `renderPlaying()` discards the return value, so the
progress-polling chain in `app.js` never has a player to poll. The
`yagni` cut on `findPlayerIn` + `currentPlayer` is the prerequisite
for the fix; capturing the return value into a closure replaces the
speculative `YT.Player.Instance` lookup with the real handle.

## What Changes

- `site/app.js`: drop `findPlayerIn`, the `currentPlayer` module
  variable, and `talkDurationGuess`; capture the return value of
  `loadTalk` into a local in `renderPlaying`; simplify `clear()`.
- `site/player.js`: drop the `PARAMS_STRING` export; drop the
  redundant try/catch in `progressFraction`.
- `scripts/build-catalog.mjs`: drop `fetchText` and `readAllowlist`
  helpers (inline into `main`); drop the `channels` array and
  `generated_at` from the build output.
- `site/catalog.json`: rebuilt without the dropped fields.
- All existing tests pass unchanged.
- `openspec/specs/dvr/spec.md`: no spec changes. The dropped code
  was either unused (exports, fields) or speculative (the
  `YT.Player.Instance` lookup); the spec did not promise any of it.
  The progress-polling fix makes a previously-broken behavior
  actually work, but the spec already required it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `dvr` capability's spec is unchanged; this change deletes
code that the spec did not require, and the progress fix is the
implementation of a behavior the spec already specifies.

## Impact

- Three source files edited, one build output regenerated.
- No new dependencies, no behavior change visible to the user, no
  spec change. The progress field in `localStorage` will now
  actually advance where it previously did not.
- Net: ~57 lines removed, one latent bug fixed, all tests still
  green.
