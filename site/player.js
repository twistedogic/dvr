// player.js: thin wrapper over the YouTube IFrame Player API.
//
// The host page loads `https://www.youtube.com/iframe_api` once. That script
// sets `window.YT` and calls `window.onYouTubeIframeAPIReady` when ready.
// Before the API is ready we queue loadTalk() calls; after, we drain the
// queue. loadTalk() destroys any previous player, builds a fresh iframe
// inside `container`, and calls onEnded when the video reaches ENDED.

const pending = [];
let apiReady = false;

// YouTube calls this once the IFrame API script is ready.
window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  while (pending.length) {
    const job = pending.shift();
    job();
  }
};

/**
 * Build a player in `container` for `videoId`. `onEnded` fires on ENDED.
 * If a previous player was attached to `container`, it is destroyed first.
 * `resumeFraction` (0..1) seeks once to fraction * duration once the
 * duration is known; see shouldSeek for the threshold.
 *
 * @param {{videoId: string, container: HTMLElement, onEnded: () => void, resumeFraction?: number}} args
 * @returns {YT.Player | null}
 */
export function loadTalk({ videoId, container, onEnded, resumeFraction = 0 }) {
  const run = () => {
    destroyContainer(container);
    // YT.Player wants a fresh DOM node with an id.
    const id = 'dvr-player-' + Math.random().toString(36).slice(2, 10);
    const div = document.createElement('div');
    div.id = id;
    container.appendChild(div);
    // Seek exactly once, when the duration is finally known. getDuration()
    // can report 0 at onReady, so the first playing/buffering event retries.
    let seeked = false;
    const trySeek = (target) => {
      if (seeked || !shouldSeek(resumeFraction)) return;
      const d = typeof target.getDuration === 'function' ? (target.getDuration() || 0) : 0;
      if (d > 0) {
        seeked = true;
        try { target.seekTo(resumeFraction * d, true); } catch {}
      }
    };
    // eslint-disable-next-line no-undef
    return new YT.Player(div, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        playsinline: 1,
        fs: 0,
        cc_load_policy: 0,
      },
      events: {
        onReady: (ev) => {
          trySeek(ev.target);
        },
        onStateChange: (ev) => {
          // YT.PlayerState.ENDED === 0
          if (ev && ev.data === 0) onEnded();
          // PLAYING === 1, BUFFERING === 3: retry the resume seek if the
          // duration was not known at onReady.
          if (ev && (ev.data === 1 || ev.data === 3)) trySeek(ev.target);
        },
      },
    });
  };
  if (apiReady) return run();
  pending.push(run);
  return null;
}

/**
 * Destroy the player inside `container` and remove its iframe. Safe to call
 * when there is no player.
 *
 * @param {HTMLElement} container
 */
export function destroyContainer(container) {
  if (!container) return;
  // Remove every iframe YT created. The API also gives us a destroy()
  // method on the player, but since we don't keep the handle here, we
  // just clear the children. YT cleans up its own listeners on iframe
  // removal.
  while (container.firstChild) container.removeChild(container.firstChild);
}

/**
 * Whether a stored playback fraction is worth seeking to on resume.
 * Below 2% the offset is resume noise (seconds into a talk); 1.0 never
 * persists (completed talks are removed from progress flow) but is
 * guarded anyway.
 *
 * @param {number} fraction
 */
export function shouldSeek(fraction) {
  return fraction >= 0.02 && fraction < 1;
}

/**
 * Return the current playback fraction (0..1) of the given player, or
 * 0 if the duration is not known. Used by app.js to persist progress.
 *
 * @param {YT.Player} player
 */
export function progressFraction(player) {
  if (!player || typeof player.getCurrentTime !== 'function') return 0;
  const t = player.getCurrentTime() || 0;
  const d = player.getDuration() || 0;
  if (d <= 0) return 0;
  return Math.min(1, t / d);
}
