// Tests for state.js. Run with: node --test site/state.test.mjs
//
// site/state.js targets the browser. We import it from Node, but first we
// install a localStorage shim on globalThis so the module sees a real-ish
// key/value store.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- localStorage shim ---
class MemoryStorage {
  constructor() { this._s = new Map(); }
  getItem(k) { return this._s.has(k) ? this._s.get(k) : null; }
  setItem(k, v) { this._s.set(k, String(v)); }
  removeItem(k) { this._s.delete(k); }
  clear() { this._s.clear(); }
  get length() { return this._s.size; }
  key(i) { return [...this._s.keys()][i] ?? null; }
}
globalThis.localStorage = new MemoryStorage();
// state.js may reference window at import time; provide a minimal stub.
globalThis.window = globalThis;

// Import after the shim is in place.
const state = await import('./state.js');

function clear() { localStorage.clear(); }

test('readState returns defaults when localStorage is empty', () => {
  clear();
  const s = state.readState();
  assert.equal(s.current, null);
  assert.deepEqual(s.progress, {});
  assert.deepEqual(s.completed, []);
  assert.equal(typeof s.version, 'string');
  assert.ok(s.version.length > 0);
});

test('writeState merges a partial state into localStorage', () => {
  clear();
  state.writeState({ current: 'abc123' });
  const s = state.readState();
  assert.equal(s.current, 'abc123');
  // progress and completed are not cleared by partial write
  assert.deepEqual(s.progress, {});
  assert.deepEqual(s.completed, []);
});

test('setCurrent sets the current talk id', () => {
  clear();
  state.setCurrent('xyz789');
  assert.equal(state.readState().current, 'xyz789');
  state.setCurrent(null);
  assert.equal(state.readState().current, null);
});

test('markComplete adds a talk to the completed set', () => {
  clear();
  state.markComplete('a');
  state.markComplete('b');
  state.markComplete('a'); // idempotent
  assert.deepEqual([...state.readState().completed].sort(), ['a', 'b']);
});

test('readState discards stale state when dvr:version does not match', () => {
  clear();
  localStorage.setItem('dvr:version', 'stale-version');
  localStorage.setItem('dvr:current', 'should-be-discarded');
  localStorage.setItem('dvr:completed', JSON.stringify(['x']));
  const s = state.readState();
  assert.equal(s.current, null);
  assert.deepEqual(s.completed, []);
});

test('pickRandom returns a talk not in completed', () => {
  const catalog = {
    talks: [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' },
    ],
  };
  const completed = new Set(['a', 'b']);
  for (let i = 0; i < 50; i++) {
    const t = state.pickRandom(catalog, completed);
    assert.ok(t, 'pickRandom returned a talk');
    assert.notEqual(t.id, 'a');
    assert.notEqual(t.id, 'b');
  }
});

test('pickRandom falls back to the full set when nothing is unwatched', () => {
  const catalog = {
    talks: [{ id: 'a' }, { id: 'b' }],
  };
  const completed = new Set(['a', 'b']);
  const t = state.pickRandom(catalog, completed);
  assert.ok(t);
  assert.ok(['a', 'b'].includes(t.id));
});
