# Spec Delta

## Purpose

This change removes ~57 lines of dead code, untested helpers inlined
into their single caller, and one redundant defensive try/catch
across the PWA. As a side effect, the previously-broken progress
polling chain in `app.js` (the player handle was discarded) is
fixed. No externally observable behavior changes beyond the now-
working progress field.

## REMOVED Requirements

### Requirement: Top-level `channels` field on the catalog
**Reason:** `site/catalog.json`'s top-level `channels` array is dead
data - the runtime never reads it, and the same channel list is
already derivable from the per-talk `channel` field.
**Migration:** If a future feature needs the channel list, derive it
from `talks[].channel` at build time or in the browser. No
runtime data was lost.

### Requirement: `generated_at` field on the catalog
**Reason:** `generated_at` was written by the build script and never
read by the runtime. Keeping it added a build-time call and bytes
per catalog entry for no consumer.
**Migration:** If a future feature needs build time, write it to a
side file (e.g. `catalog.meta.json`) or a commit message, not the
runtime payload.

## ADDED Requirements

### Requirement: Progress is written while a talk is playing
The system SHALL write the playback fraction of the current talk to
`localStorage` at least every five seconds while the talk is
playing, so a reload mid-talk can resume from the same offset.
The polling must use the actual `YT.Player` instance returned by
`loadTalk`, not an undocumented internal registry.

#### Scenario: Reload mid-talk resumes at the same offset
- **WHEN** a talk is playing and the user reloads the PWA
- **THEN** on the next render of the same talk, the IFrame API
  player is seeked to the playback fraction last written to
  `localStorage`.
