# Design

## Context

`dvr` is a single-purpose anti-doomscroll PWA. The proposal fixes the
shape (one talk at a time, trapped until 100%, 2x speed, RSS catalog,
GitHub Pages, no backend). The spec fixes the externally visible
behavior. This document fixes the technical approach: how the static
site is structured, how the IFrame API is driven, how state is
persisted, how the catalog is built, and how it is deployed.

The project is greenfield. There is no existing code under the repo
root other than `openspec/`. All design choices below are net new.

## Goals / Non-Goals

**Goals:**
- Ship a working PWA from a single static `site/` directory.
- Keep the runtime dependency-free: no framework, no bundler, no npm
  packages in the browser. The IFrame API loads from
  `youtube-nocookie.com`; everything else is local.
- Keep the build pipeline to one offline script run by hand.
- Keep GitHub Pages deployment to "push to `main`."

**Non-Goals:**
- No CI, no scheduled refresh, no remote catalog fetching at runtime.
- No user accounts, no sync, no analytics, no telemetry.
- No length filter (RSS has no duration field).
- No keyboard shortcuts, no playlist UI, no sharing.
- No native iOS / Android wrappers.
- No support for browsers that cannot install PWAs (graceful
  degradation: the site still works as a regular web page).

## Decisions

### D1. Vanilla HTML / CSS / JS, no framework

**Decision:** `site/index.html` + `site/app.js` + `site/style.css`.
Plain ES2022 modules. No React, no Vue, no Tailwind, no bundler.

**Why:** The app has one screen in two states and a player. The
entire interactive surface is well under 1,000 lines. A framework
would add weight (KB on the wire), a build step, and dependency
upkeep, for zero behavioral gain.

**Alternatives considered:** Preact (too small to matter, still a
build step); Lit (same); plain server-rendered HTML (no point -
the page is dynamic, and GitHub Pages only serves static).

### D2. YouTube IFrame Player API, not direct embed

**Decision:** Load the IFrame Player API script
(`https://www.youtube.com/iframe_api`), use `YT.Player` to construct
the player, subscribe to `onStateChange` for `ENDED`. Use
`youtube-nocookie.com` as the embed origin and the heavy URL params
(`?rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&fs=0&cc_load_policy=0`)
to suppress the YouTube UI.

**Why:** The end-screen is the only piece of YouTube UI that bleeds
into the player's natural lifecycle. Listening for `ENDED` and calling
`player.destroy()` + creating a new `<div>` + new `YT.Player` removes
the end-screen from the DOM before the user can see it. The URL
params strip the rest.

**Alternatives considered:** Pure `<iframe>` without the API
(cannot auto-advance, no event hook for ENDED). Self-hosted video
(breaks GitHub Pages, breaks the design, breaks legal).

### D3. `localStorage` with a version key

**Decision:** Four keys: `dvr:version` (string), `dvr:current`
(string | absent), `dvr:progress` (object: id -> float in [0,1)),
`dvr:completed` (array of ids). The app reads `dvr:version` on
boot; if it does not match the current build's expected version,
the app discards state and starts fresh.

**Why:** A version key is the cheapest way to make a `localStorage`
schema evolve without crashing returning users. The state is small
(<10 KB even at 5,000 talks). The version check is one `if`.

**Alternatives considered:** IndexedDB (overkill for this size;
`localStorage` is sync and survives the same way). Cookies (sent
on every request, leakier).

### D4. Service worker: cache-first for the shell, stale-while-revalidate for the catalog

**Decision:** `site/sw.js` registers a cache named `dvr-v1` and:
- Pre-caches the app shell (`index.html`, `app.js`, `style.css`,
  `manifest.webmanifest`, icons) on `install`.
- Uses stale-while-revalidate for `catalog.json` and thumbnail
  URLs: serve from cache, refresh in the background.
- Passes all other requests through (the IFrame loads directly,
  not via the SW).

**Why:** Stale-while-revalidate is the right policy for a small
JSON file that changes rarely and can be slightly out of date.
Cache-first for the shell means a returning user can open the app
without network. The SW only caches what we own; it does not
intercept the YouTube embed.

**Alternatives considered:** Network-first for everything (fails
offline). Cache-only (catalog never updates without a manual
cache bust).

### D5. Catalog build script: Node, no deps

**Decision:** `scripts/build-catalog.mjs` (single file, Node 20+
built-ins only: `fs`, `https`, `node:xml`, or a hand-rolled XML
parse). Reads `scripts/channels.txt` (one channel id per line, with
`#` comments), fetches each
`https://www.youtube.com/feeds/videos.xml?channel_id=<id>`, parses
the Atom feed, filters out anything that is a Short
(`<link rel="alternate" href=".../shorts/...">`), and writes
`site/catalog.json` as a single JSON object
`{ generated_at, channels: [...], talks: [...] }`.

**Why:** Zero npm dependencies, runs in CI or on the developer's
laptop, and the input is a flat text file. The script also resolves
the human-readable channel name from the feed's `<author><name>`
and the channel id from the feed's `<yt:channelId>`, so the
allowlist is just ids.

**Alternatives considered:** yt-dlp (gives duration, but requires
a heavier install, and we explicitly deferred duration). GitHub
Actions cron (explicitly rejected - no CI). Bash + `xmllint`
(works, but Node is more portable across the dev's machines).

### D6. Random pick: uniform over the unwatched set

**Decision:** In `IDLE`, `pickRandom(catalog, completed)` returns
`catalog[Math.floor(Math.random() * unwatched.length)]` where
`unwatched = catalog.talks.filter(t => !completed.has(t.id))`. If
`unwatched` is empty, fall back to the full set (so the user is
never stuck even after completing everything).

**Why:** The simplest correct implementation. The empty-set edge
case is one branch. Re-rolling without a completed talk means the
app keeps working forever without state migration.

**Alternatives considered:** "Least-recently-watched" ordering
(skips complexity - we have no recency data, would need to track
it; not in v1). Weighted by recency (overkill).

### D7. Repository layout

**Decision:**
```
/                         repo root
  site/                   static site (the PWA)
    index.html
    app.js
    style.css
    sw.js
    manifest.webmanifest
    icons/
    catalog.json          (build output, committed)
  scripts/
    build-catalog.mjs
    channels.txt
  openspec/               OpenSpec artifacts
  README.md
  .github/
    workflows/            empty for v1 (or a single deploy-pages job)
```

**Why:** Separating the static site from the OpenSpec and build
artifacts keeps each layer readable. The build script is one file
in `scripts/` so it can be re-run by hand.

**Alternatives considered:** Putting the site at the repo root
(collides with `openspec/`). Putting it under `docs/` (GitHub
Pages can serve from `docs/`, but `site/` is the more conventional
name and lets us choose the publishing source freely).

### D8. Deployment: GitHub Pages from `main` / `site/`

**Decision:** GitHub Pages is configured to serve from the `site/`
directory on the `main` branch (Settings -> Pages -> Source:
`main`, folder: `/site`). No GitHub Actions needed. After a catalog
refresh, the developer commits the new `catalog.json` and pushes;
the site updates on the next Pages deploy.

**Why:** The project is a static site. The simplest deploy is the
one GitHub Pages does automatically. There is no build step on
the Pages side because there is no build step for the app code.

**Alternatives considered:** A GitHub Actions workflow that
re-runs the build script and re-deploys (we said no CI). Serving
from a `gh-pages` branch (extra branch to maintain).

## Risks / Trade-offs

- **RSS feed limits to ~15 most recent per channel.** Catalog
  tops out at ~210 talks (14 channels x 15). Adding full archives
  requires `yt-dlp` or the YouTube Data API; deferred to a
  future change. → Mitigation: catalog is hand-refreshable; a
  one-line change to `build-catalog.mjs` switches to `yt-dlp` for
  full back-catalogs when desired.
- **No duration in RSS -> no length filter.** Talks shown flat,
  including short lightning talks. → Mitigation: in a future
  change, switch the data source to `yt-dlp` (which returns
  duration) and add the 20-60 / lightning split.
- **`localStorage` is per-device.** A user with two devices sees
  two different completion sets. → Mitigation: explicitly out of
  scope per the proposal.
- **YouTube IFrame API can show a "Sign in" gate on some videos.**
  → Mitigation: the catalog is a hand-curated allowlist of public
  conference talks; flags, if any, are rare. If one shows up, the
  user clicks "Browse all" and picks a different one (only after
  the current talk is complete).
- **IFrame is not a true "zero YouTube UI" - title overlay still
  flashes on load.** → Mitigation: it's brief and unavoidable
  with an embed; the design accepts this.
- **The user can clear `localStorage` to "cheat" and skip the
  current talk.** → Mitigation: the gate is a UX choice, not a
  security boundary; if the user wants to bypass it, they were
  going to leave the app anyway. `localStorage` clearing has a
  visible cost (lost progress, lost completed set) and is a
  deliberate action, not a habit.

## Migration Plan

This is a greenfield repo. There is nothing to migrate. Deploy is:

1. Push to `main` with the `site/` directory in place.
2. Configure GitHub Pages (one-time, in repo Settings).
3. Visit `https://<owner>.github.io/dvr/`.

Rollback is `git revert` (or `git reset --hard` to a known-good
commit) and `git push --force`. The user has no server-side state
to lose.

## Open Questions

None. Every deferred item (length filter, full-archive catalog,
cross-device sync, scheduled refresh) is captured in the proposal
or in a "future change" risk above and does not affect the v1
specs or task breakdown.
