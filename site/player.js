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
 *
 * @param {{videoId: string, container: HTMLElement, onEnded: () => void, startSeconds?: number}} args
 * @returns {YT.Player | null}
 */
export function loadTalk({ videoId, container, onEnded, startSeconds = 0 }) {
  const run = () => {
    destroyContainer(container);
    // YT.Player wants a fresh DOM node with an id.
    const id = 'dvr-player-' + Math.random().toString(36).slice(2, 10);
    const div = document.createElement('div');
    div.id = id;
    container.appendChild(div);
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
          if (startSeconds > 0) {
            try { ev.target.seekTo(startSeconds, true); } catch {}
          }
        },
        onStateChange: (ev) => {
          // YT.PlayerState.ENDED === 0
          if (ev && ev.data === 0) onEnded();
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
