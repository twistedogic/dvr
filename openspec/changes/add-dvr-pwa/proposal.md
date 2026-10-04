# Proposal

## Why

YouTube's homepage, recommendations, autoplay-next, and Shorts feed are engineered
to maximize time-on-site, which makes "watch one talk" drift into an hour of
unrelated browsing. `dvr` is a small PWA that plays one curated tech-conference
talk at a time, with no homepage to scroll, no autoplay-next, no comments, and no
Shorts. The user finishes a talk (or 2x-skims it) before another option becomes
available, so doomscrolling has no path in.

## What Changes

- Add a static PWA at GitHub Pages (no backend, no auth, no CI).
- Add a build script that fetches the public YouTube RSS feed for each
  whitelisted conference channel and emits a single `catalog.json` shipped
  in the repo. Run locally; commit the JSON.
- Add a YouTube IFrame API player that auto-advances to a random unwatched
  talk when the current talk reaches 100% watched. The user cannot pick a
  new talk until the current one is fully watched; 2x speed is available as
  the only escape valve.
- Add a single-suggestion home screen for the IDLE state: one random
  unwatched talk with a big "Play" button, plus a "Browse all" link.
- Persist `current` / `progress` / `completed` in `localStorage`. Per-device.
- Install as a PWA (manifest + service worker for offline catalog + thumbnails).
  Videos always stream; offline = catalog only.
- 13-channel whitelist, all org-owned conference channels (no Shorts, no
  sponsor channels, no fan channels): Strange Loop, JSConf (covers both EU
  and US - one org channel), GopherCon, RustConf, !!Con, CppCon, ElixirConf,
  LambdaConf, Curry On, CNCF, USENIX, DEF CON, Software Should Work.
- No length filter in v1 (RSS has no duration field). Talks shown flat.

## Capabilities

### New Capabilities

- `dvr`: The PWA itself - catalog shape, home state machine, player behavior,
  persistence, and PWA packaging. This is the single capability for v1.

### Modified Capabilities

None. The project has no existing capabilities.

## Impact

- New static site under a `site/` directory: `index.html`, `app.js`, `style.css`,
  `manifest.webmanifest`, `sw.js`, `catalog.json`, icons.
- New build script under `scripts/build-catalog` (one file, shell or Node).
  Not invoked at deploy time.
- New channel whitelist under `scripts/channels.txt` (one channel id per line).
- Channel IDs for some entries are still TBD at proposal time; the build script
  resolves them at first run. The verified IDs (CNCF, USENIX, DEF CON,
  Strange Loop, Software Should Work) are baked into the proposal.
- Deploy is handled by a GitHub Actions `deploy` job (see the
  `add-ci-deploy` change) that runs after the `test` job on push to `main`
  and publishes `site/` to GitHub Pages via `actions/deploy-pages`. No
  secrets, no PAT, no SSH key. The repo's Pages source is set to
  "GitHub Actions" (one-time UI change).
- No new runtime dependencies. YouTube IFrame API is loaded from
  `youtube-nocookie.com` via script tag.
- `localStorage` keys: `dvr:current`, `dvr:progress`, `dvr:completed`.
  Versioned with a `dvr:version` key for future migrations.
