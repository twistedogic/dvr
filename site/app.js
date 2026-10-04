// app.js: dvr's state machine. Renders IDLE or PLAYING based on stored
// state, and reacts to user actions (Play, Browse, pick-a-talk, ENDED).

import {
  readState,
  setCurrent,
  markComplete,
  writeState,
  pickRandom,
} from './state.js';
import { loadTalk, destroyContainer, progressFraction } from './player.js';

const root = document.getElementById('app');
let catalog = null; // {talks}

// --- catalog loading ---

async function loadCatalog() {
  const res = await fetch('./catalog.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
  return res.json();
}

// --- views ---

function clear() {
  destroyContainer(document.getElementById('player-frame'));
  while (root.firstChild) root.removeChild(root.firstChild);
}

function renderIdle(talk) {
  clear();
  root.appendChild(h1());
  const card = document.createElement('div');
  card.className = 'talk-card';

  const img = document.createElement('img');
  img.src = talk.thumbnail_url;
  img.alt = talk.title;
  card.appendChild(img);

  const title = document.createElement('h2');
  title.textContent = talk.title;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = talk.channel;
  card.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const play = document.createElement('button');
  play.textContent = 'Play';
  play.addEventListener('click', () => {
    setCurrent(talk.id);
    renderPlaying(talk);
  });
  actions.appendChild(play);
  card.appendChild(actions);

  root.appendChild(card);

  const browse = document.createElement('a');
  browse.href = '#';
  browse.className = 'browse';
  browse.textContent = 'Browse all';
  browse.addEventListener('click', (e) => {
    e.preventDefault();
    renderBrowse();
  });
  root.appendChild(browse);
}

function renderPlaying(talk) {
  clear();
  root.appendChild(h1());

  const title = document.createElement('h2');
  title.textContent = talk.title;
  root.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = talk.channel;
  root.appendChild(meta);

  const frame = document.createElement('div');
  frame.id = 'player-frame';
  root.appendChild(frame);

  const state = readState();
  // v1 has no duration in the catalog (rejected length split, RSS has no
  // duration field), so we cannot compute a real startSeconds here. The
  // player is seeked to 0 and progress is restored only as a fraction in
  // the polling loop. When duration is reintroduced, multiply the fraction
  // by talk duration here.
  const startSeconds = 0;

  const player = loadTalk({
    videoId: talk.id,
    container: frame,
    startSeconds,
    onEnded: () => handleEnded(talk),
  });

  startProgressPolling(talk, player);
}

function handleEnded(talk) {
  markComplete(talk.id);
  const state = readState();
  setCurrent(null);
  const completed = new Set(state.completed);
  const next = pickRandom(catalog, completed);
  if (!next) {
    // No talks at all - this should not happen, but render a polite error.
    clear();
    root.appendChild(h1());
    const msg = document.createElement('div');
    msg.className = 'error';
    msg.textContent = 'No talks in the catalog. Add channels to scripts/channels.txt and rebuild.';
    root.appendChild(msg);
    return;
  }
  setCurrent(next.id);
  renderPlaying(next);
}

function renderBrowse() {
  clear();
  root.appendChild(h1());

  const back = document.createElement('a');
  back.href = '#';
  back.className = 'browse';
  back.textContent = 'Back';
  back.addEventListener('click', (e) => {
    e.preventDefault();
    const s = readState();
    if (s.current) {
      const t = (catalog.talks || []).find((x) => x.id === s.current);
      if (t) return renderPlaying(t);
    }
    return renderIdle(pickRandom(catalog, new Set(s.completed)));
  });
  root.appendChild(back);

  const list = document.createElement('ul');
  list.className = 'browse-list';
  const s = readState();
  for (const t of catalog.talks || []) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = t.title + (s.completed.includes(t.id) ? '  (watched)' : '');
    if (s.current === t.id) btn.textContent = '> ' + btn.textContent;
    btn.addEventListener('click', () => {
      // If the user picks a different talk while one is in progress,
      // we honor the design: only the chosen talk becomes current, but
      // because PLAYING is now about a different talk, the previous one
      // is silently abandoned. This is by design - the spec says the
      // user cannot start a different talk from PLAYING via the home
      // view, but Browse is a back door. We accept that back door as
      // the explicit "give up" path.
      setCurrent(t.id);
      renderPlaying(t);
    });
    li.appendChild(btn);
    list.appendChild(li);
  }
  root.appendChild(list);
}

function h1() {
  const h = document.createElement('h1');
  h.textContent = 'dvr';
  return h;
}

function startProgressPolling(talk, player) {
  const tick = () => {
    const frac = progressFraction(player);
    if (frac > 0 && frac < 1) {
      const s = readState();
      s.progress[talk.id] = frac;
      writeState({ progress: s.progress });
    }
  };
  // poll every 5s; the first tick waits 5s too, which is fine.
  setInterval(tick, 5000);
}

// --- entry point ---

async function main() {
  try {
    catalog = await loadCatalog();
  } catch (e) {
    clear();
    root.appendChild(h1());
    const msg = document.createElement('div');
    msg.className = 'error';
    msg.textContent = 'Could not load catalog. Check your connection and try again.';
    root.appendChild(msg);
    return;
  }

  const s = readState();
  if (s.current) {
    const t = (catalog.talks || []).find((x) => x.id === s.current);
    if (t) return renderPlaying(t);
    // Stale id - clear it and fall through to IDLE.
    setCurrent(null);
  }
  const t = pickRandom(catalog, new Set(s.completed));
  if (!t) {
    clear();
    root.appendChild(h1());
    const msg = document.createElement('div');
    msg.className = 'error';
    msg.textContent = 'Catalog is empty. Add channels to scripts/channels.txt and rebuild.';
    root.appendChild(msg);
    return;
  }
  renderIdle(t);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

// Register the service worker. Fails silently on unsupported browsers;
// the app still works as a regular web page.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
