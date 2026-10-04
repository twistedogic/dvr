# Proposal

## Why

The current IDLE and PLAYING layouts in `site/style.css` were tuned for a
generic mobile viewport with desktop-style spacing (24px gaps, 1.5rem h1,
1.1rem h2, 200px-min button) and no safe-area insets. On an iPhone 12
(390x844 logical CSS pixels with notch and home indicator) the layout
feels stretched rather than intentional, the h1 sits under the notch, and
content crowds the home indicator. The user wants the layout centered and
tuned for the iPhone 12 viewport so that IDLE and PLAYING feel like a
purpose-built mobile surface, not a desktop page that happens to fit on a
phone.

## What Changes

- **Centered alignment in IDLE and PLAYING.** Headings (`h1`, `h2`),
  the channel `.meta` line, and the Play button render centered using
  flexbox (`align-items: center` on the column flex containers and
  `text-align: center` on text blocks). The thumbnail and player
  remain full-width.
- **iPhone 12-tuned density.** Tighter typography (h1 1.5rem -> 1.25rem,
  h2 1.1rem -> 1rem, meta 0.9rem -> 0.85rem) and tighter gaps
  (`#app` gap 24 -> 16, button padding 16/32 -> 12/24, button
  min-width 200 -> 160).
- **Safe-area insets.** `#app` padding uses
  `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` so
  content stays clear of the notch and home indicator on devices that
  report them, and falls back to sensible defaults on devices that do
  not.
- **Browse list left-aligned.** The Browse list view keeps full-width
  buttons with left-aligned text; long talk titles wrap better that
  way.
- **Service-worker cache bump.** `CACHE` in `site/sw.js` increments
  (`dvr-v1` -> `dvr-v2`) so installed PWAs pick up the new stylesheet
  on next launch instead of serving the cached old one.

No HTML or JavaScript changes. No catalog changes. No changes to the
state machine, persistence, or playback behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dvr`: The IDLE and PLAYING layouts gain explicit iPhone-12-tuned
  typography, centered text and button alignment via flexbox, and
  safe-area-aware padding. The existing requirements for "one random
  talk + single primary action + unobtrusive browse link" in IDLE and
  "only the talk's player" in PLAYING are preserved - centering the
  text and button does not change the structure of either view.

## Impact

- `site/style.css` - tighten paddings/gaps/typography, add
  `align-items: center` / `text-align: center` / `justify-content:
  center` rules, switch `#app` padding to safe-area-aware values.
- `site/sw.js` - bump `CACHE` from `'dvr-v1'` to `'dvr-v2'` so the
  service worker pre-caches the updated stylesheet.
- No HTML, JS, catalog, icon, CI, or test changes.
- Existing installed PWAs will see the new stylesheet on next launch
  after the cache bump activates.
- `site/state.test.mjs` (the only test file) is unaffected - it tests
  `state.js`, not CSS.