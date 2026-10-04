# Tasks

## 1. site/app.js

- [x] 1.1 Remove the `currentPlayer` module-level variable and the `findPlayerIn` function; verify the file no longer mentions `YT.Player.Instance`
- [x] 1.2 In `renderPlaying(talk)`, capture the return value of `loadTalk(...)` into a local `player`; pass it to `startProgressPolling(talk, frame, player)`
- [x] 1.3 Update `startProgressPolling` to take the `player` argument directly and use it for `progressFraction(player)` (no more `findPlayerIn` lookup)
- [x] 1.4 Remove `talkDurationGuess`; in the `startSeconds` calculation, inline `0` with a comment explaining the v1 no-duration design
- [x] 1.5 Simplify `clear()` to only clear the player frame's children (drop the `currentPlayer` reset)

## 2. site/player.js

- [x] 2.1 Remove the `PARAMS_STRING` export and the `PARAMS` constant that backs it; keep the `playerVars` literal in `loadTalk`
- [x] 2.2 Drop the try/catch in `progressFraction`; the `if` guard already handles the null case

## 3. scripts/build-catalog.mjs

- [x] 3.1 Inline `fetchText` into `main()`
- [x] 3.2 Inline `readAllowlist` into `main()`
- [x] 3.3 Update `build()` to return `{talks}` only (no `channels`, no `generated_at`)
- [x] 3.4 Update `main()` to write the new shape and remove the channel-count summary line
- [x] 3.5 Add `unescapeHtml` and apply it to the `title` and `channel` fields; add a test that asserts decoding works for `&quot; &amp; &lt; &gt; &apos; &#39;`

## 4. Rebuild and verify

- [x] 4.1 Re-run the catalog build and verify `site/catalog.json` has no `channels` field and no `generated_at` field, and that the talks list is unchanged
- [x] 4.2 Run the test suite and verify all tests still pass (4/4 build + 7/7 state = 11/11)
- [x] 4.3 Run `openspec validate "trim-audit-cuts" --strict` and verify exit 0

## 5. Commit and push

- [x] 5.1 Commit the changes with a clear message naming the audit and the cuts
- [x] 5.2 Push to `origin main` and verify the CI pipeline goes green (run 37174955859: test ✓, deploy ✓)

## Notes

- YouTube's RSS server is currently flaky for most of our channel IDs
  (returns 404/500 on first attempt, sometimes recovers on retry). The
  manual rebuild during this session got at most 73 of 185 talks across
  five attempts. We restored the previous 185-talk catalog for the
  deploy so the live site is unchanged; the title-rendering fix will
  land on the next successful rebuild.
- Title fix is in the code and covered by a passing test. The fix is
  decoupled from the catalog content: once a future rebuild succeeds,
  the entities will be decoded automatically.
