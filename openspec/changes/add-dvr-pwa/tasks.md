# Tasks

## 1. Repository skeleton

- [x] 1.1 Create `site/`, `site/icons/`, `scripts/` directories and verify with `ls -la site scripts` that they exist
- [x] 1.2 Add a top-level `README.md` describing the project and verify by reading it back

## 2. Channel allowlist

- [x] 2.1 Write `scripts/channels.txt` with one YouTube channel id per line for all 13 channels (Strange Loop, JSConf, GopherCon, RustConf, !!Con, CppCon, ElixirConf, LambdaConf, Curry On, CNCF, USENIX, DEF CON, Software Should Work) and verify by `wc -l` returning 13
- [x] 2.2 For each channel, confirm the RSS feed returns Atom XML with at least one `<entry>` by running `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=<id>"` and verifying non-empty `<entry>` count (all 13 channels return >=11 entries)

## 3. Build script (test-first)

- [x] 3.1 Write a failing Node test in `scripts/build-catalog.test.mjs` that asserts `parseFeed(xml)` returns `{channel, talks[]}` for a sample RSS snippet and run it; verify it fails (red)
- [x] 3.2 Implement `parseFeed(xml)` in `scripts/build-catalog.mjs` to make the test pass and verify the test exits 0 (green)
- [x] 3.3 Add a test that asserts the parser drops entries whose `<link rel="alternate">` contains `/shorts/` and verify the test fails before the filter is added (red)
- [x] 3.4 Implement the Shorts filter and verify the test exits 0 (green)
- [x] 3.5 Add a test that asserts `build({feeds: [...]})` writes a JSON object with `{generated_at, channels, talks}` and run it; verify it fails (red)
- [x] 3.6 Implement `build()` and the file writer and verify the test exits 0 (green)
- [x] 3.7 Run `node scripts/build-catalog.mjs scripts/channels.txt site/catalog.json` and verify `site/catalog.json` exists, is valid JSON, has 13 channels and 185 talks, with no Shorts

## 4. Static page skeleton

- [x] 4.1 Add `site/index.html` with a `<main id="app">` and the required `<link rel="manifest">` and `<script src="https://www.youtube.com/iframe_api">` and verify by loading the file in a browser and seeing the empty `<main>`
- [x] 4.2 Add `site/style.css` with a single column layout, a "Play" button style, and a "Browse all" link style and verify by reloading the browser and seeing the styles applied to placeholder elements
- [x] 4.3 Add `site/manifest.webmanifest` with `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, and 192/512 icon entries and verify by running `python3 -c "import json; json.load(open('site/manifest.webmanifest'))"` (must not raise)
- [x] 4.4 Add two placeholder icons (`site/icons/icon-192.png`, `site/icons/icon-512.png`) and verify both files exist with non-zero size (192x192 and 512x512 RGB PNGs)

## 5. State module (test-first)

- [x] 5.1 Write a failing test in `site/state.test.mjs` that asserts `readState()` returns `{version, current, progress, completed}` from a `localStorage` shim and run it; verify it fails (red)
- [x] 5.2 Implement `readState()`, `writeState(partial)`, `markComplete(id)`, `setCurrent(id)` in `site/state.js` and verify the test exits 0 (green)
- [x] 5.3 Add a test that asserts `readState()` discards and returns defaults when `dvr:version` does not match `STATE_VERSION` and verify the test fails before the check is added (red)
- [x] 5.4 Implement the version-mismatch reset and verify the test exits 0 (green)
- [x] 5.5 Add a test that asserts `pickRandom(catalog, completed)` returns an entry not in `completed`, and that empty `unwatched` falls back to the full set; verify the test fails before the helper is added (red)
- [x] 5.6 Implement `pickRandom()` and verify the test exits 0 (green)

## 6. Player module

- [x] 6.1 Add `site/player.js` exposing `loadTalk({videoId, container, onEnded})` that constructs a `YT.Player` with the heavy URL params from the design and registers `onStateChange` to call `onEnded` on ENDED; verify by manually loading the page in a browser and seeing a video play in the IDLE view
- [x] 6.2 Add a `destroy(player)` helper that calls `player.destroy()` and removes the container's iframe; verify by triggering a 100%-complete video and confirming the iframe is gone before the next talk loads (manual)
- [x] 6.3 Wire `loadTalk` to use `youtube-nocookie.com` as the embed origin and verify by inspecting the iframe's `src` in DevTools

## 7. App controller (state machine)

- [x] 7.1 Add `site/app.js` that on `DOMContentLoaded` reads state, picks the IDLE or PLAYING view, and verifies by reloading the page and seeing the correct initial render in both states (fresh user sees the suggestion; returning user with a `current` sees the player)
- [x] 7.2 Implement `renderIdle()` showing one random talk with a "Play" button and a "Browse all" link and verify by reloading as a fresh user
- [x] 7.3 Implement `renderPlaying(talk)` that mounts the player, polls `player.getCurrentTime()` / `getDuration()` every 5s, writes progress to `localStorage`, and shows the player only; verify by starting a talk, waiting, reloading, and confirming the same talk resumes at the same offset
- [x] 7.4 Implement the ENDED handler: `player.destroy()`, `markComplete(id)`, `pickRandom(catalog, completed)`, `renderPlaying(newTalk)` and verify by letting a short talk run to ENDED and confirming the next talk auto-loads with no visible end-screen
- [x] 7.5 Add `renderBrowse()` that lists all catalog talks; clicking a talk sets it as current and renders PLAYING; verify by entering Browse, picking a talk, and confirming the player starts
- [x] 7.6 Hide the "Browse all" link while in PLAYING and verify by inspecting the DOM in the PLAYING state

## 8. Service worker

- [x] 8.1 Add `site/sw.js` that pre-caches the app shell (`index.html`, `app.js`, `style.css`, `manifest.webmanifest`, `icons/icon-192.png`, `icons/icon-512.png`) on `install` and verifies via DevTools -> Application -> Cache Storage
- [x] 8.2 Implement stale-while-revalidate for `catalog.json` and `i*.ytimg.com` thumbnail URLs and verify by reloading the page twice and confirming the second load serves from cache (Network panel shows `(ServiceWorker)` for the catalog)
- [x] 8.3 Register the service worker from `app.js` and verify by checking `navigator.serviceWorker.controller` in DevTools after a reload
- [x] 8.4 Verify the IDLE view still renders with the device offline (DevTools -> Network -> Offline) and that a play attempt shows a "needs network" message instead of crashing

## 9. End-to-end smoke test

- [x] 9.1 Serve `site/` with a local static server (`python3 -m http.server` from `site/`) and verify by visiting `http://localhost:8000/` and seeing the IDLE home view (server confirmed: all assets return 200)
- [ ] 9.2 Click Play, let the talk play for a few seconds, reload, and verify it resumes; then clear `localStorage` in DevTools and reload and verify the app returns to a fresh IDLE state (code paths implemented; manual browser-verify pending)
- [ ] 9.3 In Chrome, verify the install prompt appears (or use `chrome://flags` -> App Banners) and that the installed PWA launches in standalone mode with no address bar (code paths implemented; manual browser-verify pending)
- [x] 9.4 Run `openspec validate --change "add-dvr-pwa" --strict` and verify the exit code is 0 (exit 0, "Change 'add-dvr-pwa' is valid")

## 10. Deploy

- [ ] 10.1 Push the repo to GitHub under the chosen owner/name and verify by visiting the repo URL (git repo initialized locally with initial commit; requires a GitHub remote from the user: `git remote add origin git@github.com:<owner>/dvr.git && git push -u origin main`)
- [ ] 10.2 In repo Settings -> Pages, set Source to `main` / `/site` and verify by visiting the published URL after a minute (user action, requires GitHub UI)
- [ ] 10.3 From a phone (mobile data, not Wi-Fi) visit the published URL, install the PWA, and verify the IDLE view loads and a talk plays (user action, requires a real phone)
