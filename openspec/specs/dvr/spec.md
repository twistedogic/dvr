# dvr - Progressive Web App

## Purpose

`dvr` is a Progressive Web App that plays one curated tech-conference talk at
a time, with no recommendations, no autoplay-next, no Shorts, and no
comments, so that opening the app to "watch one talk" cannot turn into
unrelated browsing.

## Requirements

### Requirement: Catalog of conference talks

The system SHALL ship a static `catalog.json` containing tech-conference
talks. Each entry SHALL include `id` (YouTube video id), `title`, `channel`
(channel display name), `published` (ISO 8601 date), and `thumbnail_url`.
The catalog SHALL be sourced exclusively from the public YouTube RSS feed
of channels on a hand-maintained allowlist of org-owned conference
channels, and SHALL exclude Shorts and non-talk uploads.

#### Scenario: Catalog is built from RSS only
- **WHEN** the build script runs
- **THEN** every entry in `catalog.json` is present in the RSS feed of a
  whitelisted channel and is not a Short (`/shorts/` URL or a video id
  whose thumbnail ratio indicates Shorts).

#### Scenario: Catalog is committed, not generated at runtime
- **WHEN** a user opens the PWA
- **THEN** the app reads `catalog.json` shipped with the site and does not
  fetch or generate catalog data from the network.

### Requirement: Single-talk state machine

The system SHALL maintain one of two states for the user session: `IDLE`
(no talk in progress) or `PLAYING` (a talk is the current one). The
current talk and its progress SHALL be persisted in `localStorage` under
a versioned key. In `IDLE` the home view SHALL show exactly one random
talk from the set of talks the user has not yet completed, with a single
primary action to begin playing it, and an unobtrusive link to a
full-catalog browse view. In `PLAYING` the home view SHALL show the
player and SHALL NOT expose the catalog or a way to start a different
talk.

#### Scenario: Fresh user starts a talk
- **WHEN** a user with no prior session opens the PWA
- **THEN** the home view shows one random talk from the catalog with a
  primary "Play" action and a secondary "Browse all" link.

#### Scenario: User in PLAYING cannot start a different talk
- **WHEN** the user has a current talk in progress
- **THEN** the home view shows only that talk's player; the catalog, the
  random suggestion, and any "play another" action are not visible.

#### Scenario: State survives reload
- **WHEN** the user reloads the PWA
- **THEN** the previous state (`IDLE` or `PLAYING`, with current talk id
  and progress) is restored from `localStorage`.

### Requirement: Trapped-until-complete playback

While in `PLAYING`, the system SHALL prevent the user from starting a
different talk. The only controls available SHALL be the YouTube IFrame
player's own controls plus 2x playback speed. A talk is considered
complete only when the player's reported playback time divided by the
video duration is at least 1.0 (i.e. ENDED state). The system SHALL
NOT mark a talk complete, return the user to `IDLE`, or expose a new
random suggestion based on any other condition (manual skip, close,
reload, partial progress, etc.).

#### Scenario: Talk finishes naturally
- **WHEN** the current talk reaches ENDED state
- **THEN** the system marks it complete, returns to `IDLE`, and shows
  one new random talk from the now-unwatched set.

#### Scenario: User reloads mid-talk
- **WHEN** the user reloads the PWA while a talk is at, say, 40%
- **THEN** the same talk resumes from where it was; the catalog is
  still hidden; the talk is NOT marked complete.

#### Scenario: User closes app mid-talk
- **WHEN** the user closes the PWA with the current talk incomplete
- **THEN** on next open, the same talk resumes; no progress is lost;
  the user still cannot start a different talk.

#### Scenario: 2x speed is available
- **WHEN** the user is in `PLAYING`
- **THEN** the YouTube IFrame player offers its native 2x speed control.

### Requirement: Auto-advance on completion

When a talk reaches completion while the user is still on the home view,
the system SHALL automatically load the next randomly chosen unwatched
talk without requiring a click. The auto-advance SHALL destroy the
finished player and instantiate a fresh player for the new talk, so
that the YouTube end-screen and "More videos" UI never render.

#### Scenario: Auto-advance prevents YouTube end-screen
- **WHEN** a talk reaches ENDED
- **THEN** the YouTube IFrame is destroyed and a new IFrame is created
  for the next talk within the same page lifecycle, so the end-screen
  suggestion panel is not visible at any point.

#### Scenario: Auto-advance picks from unwatched
- **WHEN** auto-advance selects the next talk
- **THEN** the chosen talk is drawn uniformly at random from the set
  of catalog entries not in the user's `completed` set.

### Requirement: Single-pick browse escape

The "Browse all" link in `IDLE` SHALL open a full-catalog list view.
Clicking any talk in that view SHALL set it as the current talk and
transition to `PLAYING`. The browse view SHALL be reachable only via
the secondary link, SHALL be reachable from `PLAYING` only after the
current talk is complete, and SHALL be reachable from the installed
PWA's app menu (so the user can leave without quitting the app).

#### Scenario: Browse all in IDLE
- **WHEN** the user taps "Browse all" from the `IDLE` home view
- **THEN** a list of all catalog talks is shown and any tap starts
  that talk and transitions to `PLAYING`.

#### Scenario: Browse all hidden in PLAYING
- **WHEN** the user is in `PLAYING`
- **THEN** no browse or catalog view is reachable from the home view.

### Requirement: No-tracking, no-backend operation

The PWA SHALL function entirely from static files plus YouTube's embed
player. The system SHALL NOT issue any network request at runtime other
than to `youtube-nocookie.com` (for the IFrame) and to the thumbnail
and icon assets shipped with the PWA. The system SHALL NOT include
analytics, telemetry, ad scripts, fonts loaded from third parties, or
any other third-party request. The system SHALL NOT require an account
or any user input other than what the user chooses to watch.

#### Scenario: No third-party requests
- **WHEN** the PWA is loaded and a talk is playing
- **THEN** the only outbound network requests are to
  `youtube-nocookie.com` and to the same origin serving the PWA.

### Requirement: PWA installability and offline catalog

The site SHALL include a Web App Manifest and a service worker. The
service worker SHALL cache the app shell, `catalog.json`, and thumbnail
images so that the catalog and the IDLE home view load while offline.
Playing a video while offline SHALL fail gracefully (the player cannot
stream without network) and SHALL NOT crash the app.

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

### Requirement: Persistence keys and migration safety

`localStorage` SHALL store three keys for the user's session state:
`dvr:current` (the id of the talk in progress, or absent), `dvr:progress`
(map of talk id to last reported playback fraction in `[0, 1)`), and
`dvr:completed` (set of talk ids the user has finished). A `dvr:version`
key SHALL be present and used to migrate or discard old state if the
shape of the stored values changes between releases.

#### Scenario: Completed set shrinks the random pool
- **WHEN** a talk is marked complete
- **THEN** it is excluded from future random suggestions in subsequent
  `IDLE` sessions.

#### Scenario: Version mismatch resets state
- **WHEN** the app reads a `dvr:version` that does not match the running
  build
- **THEN** the app discards the stale state and starts fresh (no
  partial talks, no completed set) rather than crashing.

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
