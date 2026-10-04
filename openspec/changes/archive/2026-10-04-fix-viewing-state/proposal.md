# Proposal

## Why

Viewing state fails for real users in four stacked ways: a reload mid-talk
restarts the talk at 0:00 even though the spec already promises
fraction-resume; a pull-to-refresh in `IDLE` re-rolls the offered talk into
a slot machine (the exact doomscroll pattern the app exists to kill);
returning visitors run a stale, frozen app shell because the service
worker's cache name was never bumped after the last deploy that changed
it; and `ENDED` auto-advances into the trapped `PLAYING` view without a
user tap, which drifts from the spec's "returns to IDLE" language.

## What Changes

- **Sticky IDLE offer.** The randomly offered talk in `IDLE` is persisted
  (`dvr:offered`) and restored on reload. The offer sticks until the user
  plays it; Browse remains the only sanctioned way around it. No re-roll
  by refreshing.
- **Resume by fraction at runtime.** On reload mid-talk, the player seeks
  to `stored fraction x player.getDuration()` once duration is known —
  no catalog duration source needed.
- **ENDED lands on the IDLE card** showing the next random pick as the new
  sticky offer (user decision, Option 1). The finished player is still
  destroyed so the YouTube end-screen never renders. Supersedes the
  current "auto-advance without a click" behavior.
- **Service-worker shell cache versioning.** Bump `CACHE` to `dvr-v2` so
  returning visitors stop being served the pre-fix `app.js`; establish
  the bump-on-shell-change ritual.
- **Interval leak cleanup.** The 5s progress poll is cleared on view
  navigation instead of leaking one timer per talk.
- **Catalog rebuild** to bake in the already-landed HTML-entity decode
  (blocked on YouTube RSS availability; data-only, no code change).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dvr`: requirement changes across three areas — (1) Single-talk state
  machine + Persistence keys: the `IDLE` offer is persisted and restored,
  adding a fourth `localStorage` key `dvr:offered`; (2) the Auto-advance
  on completion requirement is replaced by an end-of-talk transition that
  destroys the player, never shows the end-screen, and returns to `IDLE`
  with the next pick as the persisted offer, with the next play
  user-initiated; (3) PWA offline/installability: the app-shell cache is
  versioned so shell updates reach returning users.

## Impact

- `site/state.js` — add `offered` to the read/write state shape
  (`dvr:offered` key); extend `state.test.mjs`
- `site/app.js` — `main()` pick precedence (`current` > valid `offered` >
  fresh pick + persist); `handleEnded` renders `IDLE` instead of the next
  player; progress-poll interval cleared on navigation
- `site/player.js` — accept a resume fraction and seek once duration is
  known (onReady, falling back to the first playing/buffering event)
- `site/sw.js` — `CACHE` bumped to `dvr-v2` with a bump-on-change comment
- `site/catalog.json` — rebuilt when YouTube RSS cooperates
- No new dependencies. No breaking storage change: `dvr:offered` is
  additive, `STATE_VERSION` stays `'1'` (a bump would needlessly wipe
  returning users' completed sets).
