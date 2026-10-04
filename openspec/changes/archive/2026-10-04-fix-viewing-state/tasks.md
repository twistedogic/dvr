# Tasks

## 1. site/state.js — offered key

- [x] 1.1 Add `OFFERED_KEY = 'dvr:offered'` and extend `readState()` to return `offered: string|null` (mirroring the `current` handling); extend `writeState()` to persist or remove `offered` when present in `partial`; keep `STATE_VERSION = '1'` — verify with a round-trip check in `site/state.test.mjs`
- [x] 1.2 Add state.test.mjs coverage: offered survives write/read; `writeState({offered: null})` removes the key; malformed JSON falls back to null — verify `node --test site/` passes

## 2. site/player.js — resume by fraction

- [x] 2.1 Change `loadTalk` to accept `resumeFraction = 0` in place of `startSeconds`; seek exactly once to `resumeFraction * getDuration()` when duration is known — attempt in `onReady`, retry on the first PLAYING/BUFFERING state change if duration was 0, guarded by a `seeked` flag — verify by reading the seek logic against design D3
- [x] 2.2 Skip the seek when `resumeFraction < 0.02`; verify the guard is covered by a small pure helper test (e.g. `shouldSeek(fraction)` exported for tests, window-shimmed import if needed)

## 3. site/app.js — sticky offer, ENDED, timer

- [x] 3.1 In `main()`, implement pick precedence `current` > valid `offered` (in catalog and not completed) > fresh `pickRandom` persisted via `writeState({offered: id})`; render `IDLE` with the chosen talk — verify: reload with only `dvr:offered` set shows the same talk
- [x] 3.2 In `handleEnded`, replace `setCurrent(next.id); renderPlaying(next)` with `writeState({offered: next.id}); renderIdle(next)` (keep `markComplete` and `setCurrent(null)`); verify the ENDED path shows the card, not a player (spec: next play is user-initiated)
- [x] 3.3 In `renderPlaying`, pass `state.progress[talk.id] || 0` as `resumeFraction` to `loadTalk`; replace the `// v1 has no duration` comment (superseded by design D3) — verify a mid-talk reload seeks instead of restarting at 0
- [x] 3.4 Store the progress-poll interval id module-side; clear any prior id at the top of `startProgressPolling` and in `clear()` — verify no interval survives a view change (e.g. instrument or breakpoint check)

## 4. site/sw.js — unfreeze returning users

- [x] 4.1 Bump `CACHE` to `'dvr-v2'` and add the one-line ritual comment ("bump CACHE whenever a SHELL file's content changes"); verify by reading `sw.js` that the old name appears nowhere else — note: the bump itself was already applied by the parallel `iphone12-layout` change (same value, one bump covers both); this change added the ritual comment

## 5. Tests and validation

- [x] 5.1 Run `node --test scripts/ site/` and verify the full suite passes (existing build-catalog + state tests plus new offered/seek coverage)
- [x] 5.2 Run `openspec validate "fix-viewing-state" --strict` and verify exit 0

## 6. Catalog rebuild (independent, network-gated)

- [x] 6.1 Run `node scripts/build-catalog.mjs scripts/channels.txt site/catalog.json`; verify no `&quot;`/`&amp;`/`&#39;` sequences remain in titles and the talk count is >= 185 — YouTube RSS has been flaky (404/500); if the fetch fails or returns far fewer talks, skip this task rather than shipping a shrunken catalog, and note the retry here — rebuild succeeded: all 13 channels fetched, 185 talks (identical id set to the previous catalog, zero rotation), escaped titles 40 -> 0

## Notes

- Deploy order: tasks 1-5 are one atomic code change; task 6 is data-only
  and can land before or after (or in a later deploy when RSS cooperates).
- After deploy, returning users get the new shell on their next navigation
  (SW byte-diff on `sw.js` triggers reinstall + `dvr-v1` purge).
