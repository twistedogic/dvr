# dvr — agent guide

`dvr` is an **anti-doomscroll PWA**: one curated tech-conference talk at a time,
no autoplay-next, no Shorts, no recommendations, no comments. Static + YouTube
embed + service worker. Catalog is hand-curated from 14 org-owned conference
channels (`scripts/channels.txt`), built offline with `scripts/build-catalog.mjs`,
and committed to the repo. Deployed to GitHub Pages from `site/`.

## Runtime architecture

Vanilla JS + ES modules. No framework, no bundler, no build step — the
catalog is the only artifact produced by `scripts/`.

```
site/
  index.html        shell; loads `app.js` and YouTube's iframe_api  app.js            state machine (IDLE / PLAYING / Browse), view rendering
  state.js          localStorage helpers (current / progress / completed)
  player.js         thin wrapper over YT IFrame API; destroys on ENDED
  sw.js             service worker (stale-while-revalidate catalog + thumbnails)
  style.css         dark theme, system font stack
  catalog.json      build output (committed; refresh by hand)
  icons/            icon-192.png, icon-512.png
scripts/
  build-catalog.mjs fetches YouTube RSS, drops Shorts, writes catalog.json
  channels.txt      hand-maintained allowlist of channel ids  make-icon.py      Python; regenerates the flat-design videotape icon
```

**State machine** — `IDLE` shows one random unwatched talk + a `Play` button
+ a secondary `Browse all` link. `Play` transitions to `PLAYING` with only
the YouTube player's own controls plus 2x speed. A talk completes only when
`currentTime / duration >= 1.0` (ENDED). On completion, the player is
**destroyed** and a fresh one instantiated for the next random pick — the
YouTube end-screen and "More videos" UI never render.

## Design pillars

- **No third-party requests at runtime** beyond `youtube-nocookie.com` and
  the thumbnail/icon assets shipped with the PWA. No analytics, telemetry,
  ads, or web fonts.
- **No skip, no autoplay-next.** A talk is complete only on ENDED.
- **Browse is the only back door out of PLAYING.** Picking a different talk
  from Browse silently abandons the in-progress one — that is the explicit
  "give up" path. The home view exposes no other exit while a talk plays.
- **Keep `rel: 0` and `disablekb: 1` in `playerVars`** so YouTube's related
  videos and keyboard shortcuts stay hidden.
- **Catalog is hand-curated.** Shorts are filtered by alternate-href
  substring `/shorts/`. Adding a channel is an edit to `scripts/channels.txt`
  + a manual catalog rebuild + a commit.

## Local dev loop

```sh
# Rebuild catalog (run by hand; not in CI)
node scripts/build-catalog.mjs scripts/channels.txt site/catalog.json

# Run the test suite (CI runs the same command)
node --test scripts/ site/

# Serve locally
cd site && python3 -m http.server 8000

# Deploy: push to main; .github/workflows/test.yml handles test + Pages deploy
```

## Gotchas

- YouTube RSS has **no duration field**, so `catalog.json` has no
  `duration`. `app.js` seeks to 0 on resume; the fraction in `state.progress`
  is the only resume signal. When a duration source lands, multiply the
  fraction by duration in `renderPlaying` (the `// v1 has no duration`
  comment marks the spot).
- The icon generator is **Python**, not Node. Run `python3 scripts/make-icon.py`
  to regenerate `site/icons/`.
- `localStorage` carries a `dvr:version` key. Bump `STATE_VERSION` in
  `site/state.js` if the on-disk shape changes; returning users get wiped
  state instead of a crash.

## OpenSpec workflow

This repo is spec-driven. Authoritative capabilities live in
`openspec/specs/` (`dvr`, `dvr-icon`, `ci`, `ci-deploy`); in-flight
changes live in `openspec/changes/<name>/` and need `proposal.md` +
`design.md` + `tasks.md` + a delta spec.

```sh
openspec new change "<name>"            # scaffold a change
openspec validate --change "<name>" --strict  # the project's "test"
openspec validate --strict              # validate every spec
openspec sync specs --change "<name>"   # merge delta into main specs
openspec archive --change "<name>"      # move a deployed change to archive/
```

Detailed per-artifact rules live in `openspec/config.yaml`. The full skills
(`openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`,
`openspec-archive-change`, `openspec-explore`, `openspec-update-change`)
live in `.pi/skills/` — prefer them over free-handing changes.