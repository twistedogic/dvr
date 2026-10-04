# Spec Delta

## Purpose

The PWA's app icon is a flat-design videotape so the app is
recognizable as a single-purpose media player in the install prompt
and on the home screen.

## ADDED Requirements

### Requirement: PWA icons are a flat-design videotape
The PWA SHALL ship two icons, `site/icons/icon-192.png` and
`site/icons/icon-512.png`, that depict a flat-design videotape
(horizontal cassette body, dark window showing two reels, white
label bar, red accent stripe). The icons SHALL be opaque PNGs
that look correct under a circular or rounded-rectangle mask.

#### Scenario: Manifest references the icons
- **WHEN** `site/manifest.webmanifest` is loaded
- **THEN** it references `icons/icon-192.png` and `icons/icon-512.png`
  and the `purpose` field is `any maskable` for both.

#### Scenario: Icons are valid PNGs of the declared sizes
- **WHEN** the icon files are read
- **THEN** both are 8-bit PNGs, 192x192 and 512x512 respectively,
  and are non-empty.

#### Scenario: Icons survive a circular mask
- **WHEN** the platform applies a circular mask to the icon
- **THEN** the visible region still contains a recognizable
  videotape (the body fills the canvas, the reels and label are
  inside the safe area, no critical detail is in the corners).
