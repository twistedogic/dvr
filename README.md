# dvr

A PWA that plays one curated tech-conference talk at a time, with no
homepage, no autoplay-next, no Shorts, and no comments. Open it to
watch a talk; close it when you're done. The next talk is not
available until you finish (or 2x-skim) the current one.

`dvr` is anti-doomscroll by design.

## How it works

- The catalog is a static `site/catalog.json` generated from the
  public YouTube RSS feed of 14 hand-picked org-owned conference
  channels (Strange Loop, JSConf EU/US, GopherCon, RustConf, !!Con,
  CppCon, ElixirConf, LambdaConf, Curry On, CNCF, USENIX, DEF CON,
  Software Should Work).
- The PWA reads the catalog, picks one random unwatched talk, and
  embeds it via the YouTube IFrame Player API. When the talk ends,
  the player is destroyed and a new one is created with the next
  random talk - the YouTube end-screen never renders.
- `localStorage` stores the current talk, in-progress fraction, and
  the set of completed talk ids. State is per-device.
- The site is fully static and ships to GitHub Pages. No backend, no
  CI, no analytics.

## Layout

```
site/                   the PWA (what GitHub Pages serves)
  index.html
  app.js                state machine + view rendering
  state.js              localStorage helpers
  player.js             YouTube IFrame API wrapper
  sw.js                 service worker
  style.css
  manifest.webmanifest
  icons/                PWA icons
  catalog.json          build output (committed)
scripts/
  build-catalog.mjs     fetches RSS, writes catalog.json
  build-catalog.test.mjs  node:test tests
  channels.txt          one YouTube channel id per line
openspec/               planning artifacts
```

## Build the catalog

```sh
node scripts/build-catalog.mjs scripts/channels.txt site/catalog.json
```

Run this by hand when you want to refresh. Commit the resulting
`site/catalog.json`.

## Run the test suite

```sh
node --test scripts/
```

## Serve locally

```sh
cd site && python3 -m http.server 8000
# open http://localhost:8000/
```

## Deploy

Push to `main` on GitHub. In repo Settings -> Pages, set Source to
`main` / `/site`. The site appears at
`https://<owner>.github.io/dvr/`.
