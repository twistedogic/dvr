# Tasks

## 1. CSS layout changes in site/style.css

- [x] 1.1 Update `#app` to use safe-area-aware padding and tighten the gap; verify by reading the rule back: padding is `calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 32px)` and gap is `16px`.
- [x] 1.2 Tighten `h1` (font-size 1.5rem -> 1.25rem) and add `text-align: center`; tighten `h2` (font-size 1.1rem -> 1rem) and add `text-align: center`; verify by reading both rules back.
- [x] 1.3 Tighten `button` (padding 16px 32px -> 12px 24px, font-size 1.1rem -> 1rem, min-width 200px -> 160px); verify by reading the rule back.
- [x] 1.4 Add `align-items: center` to `.talk-card` and `align-self: stretch` to `.talk-card img` so the thumbnail keeps full container width while the card's other children center; verify by reading both rules back and confirming `width: 100%` on the img still resolves against the full card width.
- [x] 1.5 Add `text-align: center` and font-size 0.85rem to `.talk-card .meta`; add `justify-content: center` to `.talk-card .actions`; verify by reading both rules back.
- [x] 1.6 Tighten `.browse-list` gap (16px -> 12px) and `.browse-list button` font-size (1rem -> 0.95rem); keep buttons full-width with `text-align: left`; verify by reading both rules back.

## 2. Service worker cache bump in site/sw.js

- [x] 2.1 Bump the `CACHE` constant in `site/sw.js` from `'dvr-v1'` to `'dvr-v2'` so installed PWAs re-cache the updated stylesheet on next launch; verify by reading the constant back.

## 3. Manual verification

- [x] 3.1 Run `node --test scripts/ site/` to verify the new `site/layout.test.mjs` smoke test (5 assertions on `style.css` rule patterns) passes alongside the existing 11 tests; confirm the test catches a deliberate regression by mutation (changing `align-items: center` to `flex-start` makes the smoke test fail with a clear `expected .talk-card align-items: center` message). Visual verification on a real iPhone 12 / Chrome DevTools iPhone 12 emulation (390x844, device toolbar on) remains the user's step before deploy: confirm (a) IDLE shows centered title + centered channel + centered Play button with full-width thumbnail, (b) PLAYING shows centered title + centered channel + full-width player, (c) `h1` is not under the notch and the home indicator does not overlap content, (d) Browse list buttons stay full-width with left-aligned text.