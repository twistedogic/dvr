# Design

## Context

`site/style.css` has zero media queries and no safe-area awareness.
Density was tuned for a generic mobile viewport with desktop-style
spacing: `#app` gap 24, `h1` 1.5rem, `h2` 1.1rem, button padding
16/32 with 200px min-width, and `padding: 24px 16px 64px`. On an
iPhone 12 (390x844, notch + home indicator) this produces a layout
that reads as desktop-on-mobile: a small IDLE card sits in the upper
third of a long black screen, the `h1` sits under the notch, and the
bottom edge crowds the home indicator. See `proposal.md` for the
motivation and the spec delta under `specs/dvr/spec.md` for the new
requirement this design satisfies.

## Goals / Non-Goals

**Goals:**

- Center the headings, channel line, and Play button in IDLE and
  PLAYING using flexbox (per the user's "use flexbox and align center"
  direction).
- Keep the thumbnail and player full-width inside their containers.
- Replace the hand-tuned padding with `env(safe-area-inset-top)` and
  `env(safe-area-inset-bottom)` so notched devices and PWA mode are
  honored automatically.
- Tighten typography and gaps so the IDLE card sits in roughly the
  upper half of a 390x844 viewport instead of the upper third.
- Ship the new stylesheet to installed PWAs by bumping the service
  worker cache name.

**Non-Goals:**

- No structural HTML changes, no JS changes, no catalog changes.
- No media queries or breakpoints - 390x844 is the single design
  target; the result also looks reasonable on iPhone SE (375x667) and
  iPhone 14 Pro Max (430x932) without per-device rules.
- No changes to the state machine, persistence, playback behavior,
  or the Browse list's left-aligned full-width buttons.
- No new dependencies, no preprocessor, no build step. CSS edit only.

## Decisions

### 1. Center via per-container flexbox alignment, not `#app`-wide

The natural reading of "use flexbox and align center" is to set
`align-items: center` on `#app` (the existing `display: flex;
flex-direction: column` root). Rejected: with `align-items: center` on
`#app`, `.talk-card`'s intrinsic cross-size is determined by its
non-percentage children (title, meta, button width) because the
`width: 100%` thumbnail gets treated as `auto` for intrinsic sizing.
The thumbnail would shrink to the title's width on narrow viewports,
which is wrong.

Picked: keep `#app` at the default `align-items: stretch` so
`.talk-card` stretches to `#app`'s content width (and so the thumbnail
keeps `width: 100%` resolving to full container width). Apply
`align-items: center` one level deeper on `.talk-card` for IDLE,
combined with `text-align: center` on `h1`, `h2`, `.meta` and
`justify-content: center` on `.actions`. For PLAYING, where the
title / meta sit directly under `#app`, use `text-align: center` on
each. This keeps the thumbnail and player full-width while centering
text and button.

### 2. Safe-area padding via `calc(env(...) + base)`

Replacing the fixed `padding: 24px 16px 64px` with
`padding: calc(env(safe-area-inset-top) + 16px) 16px
calc(env(safe-area-inset-bottom) + 32px)` gives a graceful default
on devices without safe areas (env() returns 0 there) and adds the
correct inset on notched devices and PWA mode. Picked over hand-tuned
per-device rules because env() is the platform-native answer and
viewport-fit=cover is already set in `index.html`.

### 3. Single CSS file, no media queries

iPhone 12 is the design target; the resulting CSS also reads well on
the narrower iPhone SE (IDLE content fits with ~110px to spare) and
the wider iPhone 14 Pro Max (extra vertical air, no broken layout).
Adding a `@media (max-width: 480px)` block to "be responsive" would
duplicate rules for a target that already looks right. Skipped.

### 4. Service worker cache bump

`site/sw.js` caches the shell under the name `CACHE = 'dvr-v1'`.
Bumping to `'dvr-v2'` makes the new install fetch the updated
`style.css` and re-cache the shell under the new name; the activate
handler deletes `'dvr-v1'`. Without the bump, installed PWAs keep
serving the cached old stylesheet until the user clears site data or
hard-refreshes. Picked over leaving the cache name because shipping
the CSS change without bumping the cache is the more surprising
behavior.

### 5. Browse list deliberately left-aligned

Buttons in `.browse-list` stay full-width with `text-align: left`.
Long talk titles (the catalog includes multi-paragraph titles) read
better as left-aligned wrapped text in a wide button than centered
text in a narrow button. User endorsed this in the exploration
thread. Browse gets no changes other than inheriting the new global
density (smaller font, tighter gap).

## Risks / Trade-offs

- **[Tight typography on a 320px-class device]** IDLE on an older
  iPhone SE 1st gen (320x568) would have less than 50px of
  vertical breathing room. Acceptable because (a) that device is
  out of scope for the "iPhone 12 target" brief, (b) the layout
  still fits, and (c) `rem`-based font sizes scale with the user's
  browser font setting. Mitigation: if it ever becomes a problem,
  add a single small-screen media query later.

- **[Extra black space below IDLE on tall phones]** iPhone 14 Pro
  Max (430x932) leaves ~450px below the IDLE card. This reads as
  intentional breathing room rather than broken layout because the
  IDLE card is vertically anchored to the top of `#app`, not
  centered. No mitigation planned; vertical-centering would
  contradict the trap-in-PLAYING feel.

- **[Safe-area env() requires viewport-fit=cover]** If a future
  change ever removes `viewport-fit=cover` from `<meta name="viewport">`
  in `index.html`, the `env()` insets silently become 0 even on
  notched devices. Mitigated by the existing viewport meta and
  noted as a coupling; no extra check added.

- **[Cache bump forces a one-time reinstall]** Existing installed
  PWAs go through one full SW reinstall cycle. No user data is
  lost (localStorage is not in the cache name scope).

## Migration Plan

1. Apply the CSS edits in `site/style.css` (see `tasks.md` for the
   exact rule list).
2. Bump `CACHE` in `site/sw.js` from `'dvr-v1'` to `'dvr-v2'`.
3. Manual verification (no automated tests touch CSS):
   - Serve `site/` locally (`cd site && python3 -m http.server
     8000`).
   - Open in Chrome DevTools with iPhone 12 emulation and the
     "Toggle device toolbar" device frame on.
   - Confirm IDLE: thumbnail full-width, title + channel centered
     below, Play button centered, Browse all centered below.
   - Confirm PLAYING: title + channel centered, player full-width.
   - Confirm Browse: full-width left-aligned buttons, scrollable.
   - Confirm the `h1` does not sit under the notch in either view.
5. Push. `.github/workflows/test.yml` runs `node --test scripts/
   site/` (unchanged; CSS is not in test surface).

Rollback: revert the two files. The cache bump is forward-only; a
second bump from `'dvr-v2'` back to `'dvr-v1'` would restore the old
CSS to current installs.

## Open Questions

None. The iPhone 12 viewport is the concrete target, Browse stays
left-aligned, and the change is purely CSS plus a cache-name bump.