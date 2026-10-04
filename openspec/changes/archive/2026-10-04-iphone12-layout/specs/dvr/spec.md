# Spec Delta

## ADDED Requirements

### Requirement: Mobile-tuned centered layout with safe-area insets

The system SHALL render the IDLE and PLAYING views with typography,
padding, and component spacing tuned for a 390x844 mobile viewport
(iPhone 12 and equivalent). Headings (`h1`, `h2`), the channel meta
line, and the primary action button SHALL be center-aligned within
their containers using flexbox. The thumbnail in IDLE and the player
in PLAYING SHALL remain full-width. Top and bottom padding SHALL
respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
so content stays clear of device notches and home indicators. The
Browse list view SHALL keep full-width buttons with left-aligned text
so long talk titles wrap legibly.

#### Scenario: IDLE renders centered text and centered button

- **WHEN** the user opens the PWA on a 390x844 mobile viewport with
  no current talk (IDLE state)
- **THEN** the home view shows the talk thumbnail full-width, the
  talk title and channel name center-aligned below the thumbnail, and
  the Play button center-aligned below the channel name, all within
  the safe-area-aware padding of the layout container.

#### Scenario: PLAYING renders centered title and full-width player

- **WHEN** the user is in PLAYING state on a 390x844 mobile viewport
- **THEN** the home view shows the talk title and channel name
  center-aligned above a full-width player, with no catalog, browse
  link, or alternate-talk controls visible.

#### Scenario: Safe-area insets keep content clear of the notch

- **WHEN** the device reports a non-zero
  `env(safe-area-inset-top)` (notched phone in fullscreen / PWA mode)
- **THEN** the top padding of the layout container includes that
  inset plus the layout's base top padding, so the `h1` does not sit
  under the notch.

#### Scenario: Safe-area insets keep content clear of the home indicator

- **WHEN** the device reports a non-zero
  `env(safe-area-inset-bottom)` (PWA mode on iPhones with a home
  indicator)
- **THEN** the bottom padding of the layout container includes that
  inset plus the layout's base bottom padding, so the Browse all link
  (IDLE) and the bottom edge of the player frame (PLAYING) are not
  obscured by the home indicator.

#### Scenario: Browse list keeps left-aligned full-width buttons

- **WHEN** the user opens the Browse all view on a 390x844 mobile
  viewport
- **THEN** each talk is rendered as a full-width button with
  left-aligned text, so long talk titles wrap legibly without being
  centered inside a narrow box.