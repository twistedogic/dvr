# Design

## Context

The `add-dvr-pwa` change shipped a PWA. A whole-repo ponytail audit
later found ~57 lines of over-engineering plus a latent bug: the
progress-polling chain in `app.js` never had access to the
`YT.Player` instance, so `localStorage` progress never advanced.
The fix is the same change that removes the speculative
`findPlayerIn` lookup: capture the return value of `loadTalk`.

The spec for this change captures two removed fields and one
behaviour the existing `dvr` spec already implied but that the
implementation did not actually deliver (progress persistence).

## Goals / Non-Goals

**Goals:**
- Land every audit finding that is not out of scope.
- Make the broken progress polling actually work, because the
  audit's prerequisite cut enables the fix.
- All existing tests still pass unchanged.
- Re-run the catalog build so `site/catalog.json` reflects the
  new shape (no `channels`, no `generated_at`).

**Non-Goals:**
- No new tests for the cuts. The cuts delete code that no test
  covered, and the inlined helpers remain untestable in
  isolation. This matches the audit's framing.
- No spec change beyond the REMOVED fields. The progress fix is
  an implementation change for a behavior the dvr spec already
  required.

## Decisions

### D1. Inline `fetchText` and `readAllowlist` into `main`

**Decision:** Both helpers move into `main()` as local blocks.
Neither is exported, neither is tested in isolation, and `main()`
is short enough to read end-to-end with them inlined.

**Why:** The audit flagged them as `yagni`. They exist because
`main()` was written as a flat script and the helpers grew out of
it. Inlining is a one-pass refactor.

### D2. Drop `channels` and `generated_at` from the catalog

**Decision:** Both fields leave `catalog.json` and the
`build()` return shape. `channels` is redundant with
`talks[].channel`; `generated_at` is write-only.

**Why:** The audit flagged both. Removing them shrinks the
runtime payload and the build code. The `dvr` spec has a
delta that documents the removal so a future change does
not re-add them by accident.

### D3. Capture `loadTalk`'s return value in `renderPlaying`

**Decision:** `renderPlaying` holds the player in a local
variable and passes it to `startProgressPolling`. The module-level
`currentPlayer` and the `findPlayerIn` helper go away. `clear()`
no longer nulls `currentPlayer`.

**Why:** This is the real fix the audit made possible.
`loadTalk` returns the `YT.Player` instance once the API is
ready (or `null` if it was queued). Capturing it directly
removes the dependency on the undocumented `YT.Player.Instance`
lookup and makes `progressFraction` see a real player.

**Trade-off:** When the API is still loading, `loadTalk` returns
`null` and the local is null for one tick. `progressFraction`
already handles null by returning 0, so progress simply does
not advance for the first 5 seconds. Acceptable.

### D4. Drop `PARAMS_STRING` export from `player.js`

**Decision:** Remove the export. The string was the URL-joined
form of the player vars and is not used anywhere.

**Why:** Audit flagged it as `delete`. The note that justified
keeping it ("kept around for a future feature") is YAGNI.

### D5. Drop the try/catch in `progressFraction`

**Decision:** The `if` guard at the top already handles the
"player is null or not ready" case. The try/catch around the
two `getCurrentTime()` / `getDuration()` calls is defensive
paranoia; the YouTube IFrame API does not throw on those calls
when the player exists.

**Why:** Audit flagged it as `shrink`. The guard already covers
the only failure mode that mattered.

### D6. Drop `talkDurationGuess`

**Decision:** Inline the `0` it returns. v1 has no duration
field (rejected length split), so the `startSeconds` calculation
is a no-op until the field is reintroduced. The function name
hides that.

**Why:** Audit flagged it as `delete`. The placeholder nature of
the function is clearer when the call site just uses `0` with
a comment.

## Risks / Trade-offs

- **Progress polling is now functional where it was previously
  silent.** This is a behavior change in the sense that
  `localStorage` will start to actually accumulate progress.
  The user-visible effect: reloading a talk resumes from the
  last reported position (which the spec already required, but
  that the implementation never delivered). No new failure mode.
- **The catalog JSON shape changes.** Anything that read
  `catalog.channels` or `catalog.generated_at` will break.
  Nothing in the runtime or the tests does.
- **No test changes.** The cuts are in code that no test
  covered, and the fix is in code that the existing dvr spec
  required. Adding a test for the now-working progress
  persistence would be a separate change.

## Migration Plan

1. Edit `site/app.js`, `site/player.js`,
   `scripts/build-catalog.mjs` per the decisions above.
2. Re-run the catalog build: `node scripts/build-catalog.mjs
   scripts/channels.txt site/catalog.json`.
3. Run the test suite: `node --test scripts/ site/`.
4. Commit. Push.

Rollback is a single `git revert`.

## Open Questions

None.
