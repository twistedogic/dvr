// state.js: dvr's localStorage helpers. Runs in the browser; tested in
// Node with a localStorage shim. Single source of truth for the user's
// current talk, in-progress fraction, and completed set.

const VERSION_KEY = 'dvr:version';
const CURRENT_KEY = 'dvr:current';
const PROGRESS_KEY = 'dvr:progress';
const COMPLETED_KEY = 'dvr:completed';
const OFFERED_KEY = 'dvr:offered';

// Bump this when the on-disk shape changes. A returning user with a stale
// version gets a fresh state rather than a crash.
export const STATE_VERSION = '1';

/**
 * Read the user's state. Discards and replaces with defaults if the stored
 * version does not match STATE_VERSION.
 * @returns {{version: string, current: string|null, progress: Object<string, number>, completed: string[], offered: string|null}}
 */
export function readState() {
  const v = localStorage.getItem(VERSION_KEY);
  if (v !== STATE_VERSION) {
    // Wipe and persist the new version. Done synchronously so subsequent
    // reads see the new shape.
    localStorage.removeItem(CURRENT_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(COMPLETED_KEY);
    localStorage.removeItem(OFFERED_KEY);
    localStorage.setItem(VERSION_KEY, STATE_VERSION);
  }
  const currentRaw = localStorage.getItem(CURRENT_KEY);
  const offeredRaw = localStorage.getItem(OFFERED_KEY);
  const progressRaw = localStorage.getItem(PROGRESS_KEY);
  const completedRaw = localStorage.getItem(COMPLETED_KEY);
  return {
    version: STATE_VERSION,
    current: currentRaw || null,
    offered: offeredRaw || null,
    progress: progressRaw ? safeJson(progressRaw, {}) : {},
    completed: completedRaw ? safeJson(completedRaw, []) : [],
  };
}

/**
 * Merge a partial state into localStorage. Keys not present in `partial`
 * are left alone.
 * @param {{current?: string|null, progress?: Object, completed?: string[], offered?: string|null}} partial
 */
export function writeState(partial) {
  if ('current' in partial) {
    if (partial.current == null) localStorage.removeItem(CURRENT_KEY);
    else localStorage.setItem(CURRENT_KEY, partial.current);
  }
  if ('offered' in partial) {
    if (partial.offered == null) localStorage.removeItem(OFFERED_KEY);
    else localStorage.setItem(OFFERED_KEY, partial.offered);
  }
  if ('progress' in partial) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(partial.progress));
  }
  if ('completed' in partial) {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(partial.completed));
  }
  // Make sure the version key is always present.
  if (!localStorage.getItem(VERSION_KEY)) {
    localStorage.setItem(VERSION_KEY, STATE_VERSION);
  }
}

export function setCurrent(id) {
  writeState({ current: id });
}

export function markComplete(id) {
  const s = readState();
  if (!s.completed.includes(id)) {
    s.completed.push(id);
    writeState({ completed: s.completed });
  }
}

/**
 * Pick a random talk from `catalog.talks` that is not in `completed`.
 * If the unwatched set is empty, fall back to the full set so the user
 * is never stuck.
 * @param {{talks: Array<{id: string}>}} catalog
 * @param {Set<string>} completed
 * @returns {{id: string} | undefined}
 */
export function pickRandom(catalog, completed) {
  const all = catalog.talks || [];
  if (all.length === 0) return undefined;
  const unwatched = all.filter((t) => !completed.has(t.id));
  const pool = unwatched.length > 0 ? unwatched : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

function safeJson(text, fallback) {
  try {
    const v = JSON.parse(text);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
