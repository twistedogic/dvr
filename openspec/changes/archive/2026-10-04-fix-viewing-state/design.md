# Design

## Context

See proposal.md - Why. Constraints that shape this design: the catalog
has no duration field (YouTube RSS lacks one), `app.js`/`player.js`
cannot be imported under `node --test` without shims (they touch
`document`/`window` at module top), and the service worker installs only
when its own bytes change (browsers byte-diff `sw.js` on navigation).

Current code involved:

- `site/state.js` — `readState`/`writeState` over four `localStorage`
  keys (version, current, progress, completed); `pickRandom`.
- `site/app.js` — `main()` picks fresh on every load when `current` is
  absent; `handleEnded` calls `renderPlaying(next)`; progress polling
  leaks one `setInterval` per talk; `renderPlaying` always passes
  `startSeconds = 0`.
- `site/player.js` — `loadTalk` accepts `startSeconds` and seeks in
  `onReady` when `> 0`; `progressFraction` computes currentTime/duration.
- `site/sw.js` — cache-first shell under `CACHE = 'dvr-v1'`, unchanged
  since the initial commit, so returning visitors are frozen on the
  pre-`5c92241` `app.js` whose polling never found the player.

## Goals / Non-Goals

**Goals:**

- Refresh/pull-to-refresh in `IDLE` shows the same offered talk.
- Reload mid-`PLAYING` resumes near the stored offset, without a catalog
  duration source.
- ENDED destroys the player, lands on the `IDLE` card, and persists the
  next pick as the offer.
- Returning visitors receive current shell code after this deploy.
- No leaked timers across view transitions.

**Non-Goals:**

- No "roll again" button on the `IDLE` card (Browse stays the only
  escape; adding a re-roll affordance would reintroduce the slot
  machine).
- No catalog `duration` field and no completion tolerance changes —
  completion remains strictly the ENDED/fraction >= 1.0 rule.
- No switch of the app shell to stale-while-revalidate; manual cache-name
  bumps remain the update mechanism.

## Decisions

### D1: Fourth localStorage key `dvr:offered`, not reusing `dvr:current`

`main()` pick precedence becomes: `current` > valid `offered` > fresh
random pick (persisted as `offered`). "Valid" = id exists in the catalog
and is not in `completed`.

Alternative: call `setCurrent()` immediately when rendering `IDLE`. One
line, but reload would then route through the `current` branch and land
in `renderPlaying` — a cued video frame instead of the card, conflating
"offered" with "started" and auto-trapping. Rejected.

### D2: No `STATE_VERSION` bump

`dvr:offered` is additive; existing keys keep their shape, and older
state without an offer simply triggers a fresh pick. Bumping to `'2'`
would wipe every returning user's `completed` set for no benefit. The
version key stays `'1'`.

### D3: Resume by fraction using the player's runtime duration

`renderPlaying` reads `state.progress[talk.id]` and passes it to
`loadTalk` as a `resumeFraction` (replacing the dead `startSeconds = 0`
and the `// v1 has no duration` comment). The player seeks exactly once
when `getDuration() > 0`: attempted in `onReady`, and again on the first
PLAYING/BUFFERING state change if duration was still 0 at ready time
(known IFrame API quirk). A `seeked` flag prevents double-seeks; the
seek is skipped entirely for fractions below `0.02` (resuming 2 seconds
into a talk is noise).

Alternative: wait for a catalog duration source as AGENTS.md suggested.
Rejected — `getDuration()` at runtime makes the catalog field
unnecessary for resume.

### D4: `handleEnded` renders `IDLE`, per the spec's letter (user decision)

`markComplete` → `setCurrent(null)` → pick next → persist as `offered` →
`renderIdle(next)`. The destroy still happens inside `renderIdle`'s
`clear()` before any end-screen paints. This supersedes the removed
auto-advance requirement; every entry into `PLAYING` is now
user-initiated.

### D5: One module-level poll timer, cleared in `clear()`

`startProgressPolling` stores its interval id module-side and clears any
previous one; `clear()` (called by every render path) also clears it.
This kills the per-talk leak and the dead-player console spam from
orphaned ticks without threading a handle through view signatures.

### D6: Shell cache bump to `'dvr-v2'` + ritual comment

Changing `CACHE` changes `sw.js` bytes, so browsers re-run install and
`addAll` refreshes every shell entry; `activate` purges `dvr-v1`. A
one-line comment in `sw.js` ("bump CACHE whenever a SHELL file's content
changes") makes the ritual explicit for future edits.

Alternative: query-string cache busting or SWR for the shell — more
moving parts for no gain at this scale. Rejected.

## Risks / Trade-offs

- [Offered talk sticks indefinitely if never played] → By design; Browse
  is the sanctioned alternative. The spec scenario makes the stickiness
  normative.
- [`getDuration()` stays 0 on some videos even after PLAYING] → The
  state-change fallback retries; if duration never reports, the talk
  starts at 0 — same as today, no regression.
- [Two tabs can race on `offered`] → Last write wins; the validity check
  on load makes any stale offer self-healing. Single-user PWA; accepted.
- [Users with the old SW never navigate again] → SW update checks happen
  on navigation; nothing to do for truly dormant tabs. Accepted.

## Migration Plan

Single deploy, no data migration: existing `dvr:current`, `dvr:progress`,
and `dvr:completed` carry over; first load either honors the absent
offer with a fresh pick or resumes mid-talk as before. Rollback is a
revert; the extra `dvr:offered` key is inert to older code. The catalog
rebuild is independent and can land whenever YouTube RSS cooperates.
