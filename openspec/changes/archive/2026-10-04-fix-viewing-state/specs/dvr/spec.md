# Spec Delta

## MODIFIED Requirements

### Requirement: Single-talk state machine

The system SHALL maintain one of two states for the user session: `IDLE`
(no talk in progress) or `PLAYING` (a talk is the current one). The
current talk, its progress, and the talk offered in `IDLE` SHALL be
persisted in `localStorage` under a versioned key. In `IDLE` the home
view SHALL show exactly one random talk from the set of talks the user
has not yet completed, with a single primary action to begin playing it,
and an unobtrusive link to a full-catalog browse view. The offered talk
SHALL itself be persisted: reloading or refreshing while in `IDLE`
restores the same offer rather than drawing a new random talk. In
`PLAYING` the home view SHALL show the player and SHALL NOT expose the
catalog or a way to start a different talk.

#### Scenario: Fresh user starts a talk
- **WHEN** a user with no prior session opens the PWA
- **THEN** the home view shows one random talk from the catalog with a
  primary "Play" action and a secondary "Browse all" link.

#### Scenario: User in PLAYING cannot start a different talk
- **WHEN** the user has a current talk in progress
- **THEN** the home view shows only that talk's player; the catalog, the
  random suggestion, and any "play another" action are not visible.

#### Scenario: Refresh in IDLE re-offers the same talk
- **WHEN** the user reloads or pull-to-refreshes the PWA while in `IDLE`
  with an unplayed offer
- **THEN** the home view shows the same offered talk again; no new random
  draw occurs, so refreshing cannot be used to farm suggestions.

#### Scenario: State survives reload
- **WHEN** the user reloads the PWA
- **THEN** the previous state (`IDLE` with its offered talk, or `PLAYING`
  with current talk id and progress) is restored from `localStorage`.

### Requirement: Persistence keys and migration safety

`localStorage` SHALL store four keys for the user's session state:
`dvr:current` (the id of the talk in progress, or absent), `dvr:progress`
(map of talk id to last reported playback fraction in `[0, 1)`),
`dvr:completed` (set of talk ids the user has finished), and
`dvr:offered` (the id of the talk offered in `IDLE`, or absent). A
`dvr:version` key SHALL be present and used to migrate or discard old
state if the shape of the stored values changes between releases.

#### Scenario: Completed set shrinks the random pool
- **WHEN** a talk is marked complete
- **THEN** it is excluded from future random suggestions in subsequent
  `IDLE` sessions.

#### Scenario: Offered talk survives reload
- **WHEN** the app starts and `dvr:current` is absent but `dvr:offered`
  names a talk present in the catalog and not in `dvr:completed`
- **THEN** the `IDLE` view shows that talk without drawing a new random
  pick.

#### Scenario: Invalid offer is replaced
- **WHEN** the app starts and `dvr:offered` names a talk that is missing
  from the catalog or already in `dvr:completed`
- **THEN** the app draws a fresh random unwatched talk, persists it as
  the new offer, and shows it.

#### Scenario: Version mismatch resets state
- **WHEN** the app reads a `dvr:version` that does not match the running
  build
- **THEN** the app discards the stale state and starts fresh (no partial
  talks, no completed set) rather than crashing.

### Requirement: PWA installability and offline catalog

The site SHALL include a Web App Manifest and a service worker. The
service worker SHALL cache the app shell, `catalog.json`, and thumbnail
images so that the catalog and the IDLE home view load while offline.
The app-shell cache name SHALL be changed whenever a release changes the
contents of cached shell files, so that returning users receive updated
shell code instead of a permanently stale copy. Playing a video while
offline SHALL fail gracefully (the player cannot stream without network)
and SHALL NOT crash the app.

#### Scenario: Installable on supported browsers
- **WHEN** a supported browser (Chrome, Edge, Firefox, Safari iOS) visits
  the site
- **THEN** the browser offers to install the PWA via its standard
  install flow (the manifest is present, valid, and the page meets
  installability criteria).

#### Scenario: Catalog visible offline
- **WHEN** the device is offline
- **THEN** the PWA still shows the `IDLE` home view with the cached
  random suggestion; playing a talk shows a "needs network" message
  instead of crashing.

#### Scenario: Shell updates reach returning users
- **WHEN** a release changes cached app-shell files and bumps the
  service worker's shell cache name
- **THEN** a returning visitor's next page load is served the updated
  shell code, not the copy frozen at their first visit.

## REMOVED Requirements

### Requirement: Auto-advance on completion
**Reason**: Loading the next talk's player without a click put users
into the trapped `PLAYING` view without explicit consent, and
contradicted the trapped-until-complete requirement's "returns to IDLE"
language. Refresh-driven offer farming and auto-advance both acted as
slot-machine mechanics against the app's one-deliberate-talk philosophy.
**Migration**: Completion now transitions to `IDLE` showing the next
random pick as the persisted offer (see the End-of-talk transition
requirement). The finished player is still destroyed immediately so the
YouTube end-screen never renders. Users press Play to start the next
talk.

## ADDED Requirements

### Requirement: End-of-talk transition

When the current talk reaches completion, the system SHALL mark it
complete, destroy the player immediately (so the YouTube end-screen and
"More videos" UI never render), return the user to `IDLE`, and show the
next randomly chosen unwatched talk as the persisted offer. The next
play SHALL be initiated by the user, not automatically.

#### Scenario: End-screen never renders
- **WHEN** the current talk reaches ENDED
- **THEN** the YouTube IFrame is destroyed within the same page lifecycle
  before the end-screen suggestion panel can become visible.

#### Scenario: Completion returns to IDLE with a fresh offer
- **WHEN** the current talk reaches ENDED
- **THEN** the app marks it complete, returns to `IDLE`, and shows one
  new random talk from the now-unwatched set, persisted as the offer.

#### Scenario: Next play is user-initiated
- **WHEN** the app returns to `IDLE` after a talk completes
- **THEN** no player is instantiated for the offered talk until the user
  presses the primary play action.
