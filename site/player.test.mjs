// Tests for player.js's pure resume-seek helper. Run with:
// node --test site/player.test.mjs
//
// player.js targets the browser and assigns window.onYouTubeIframeAPIReady
// at import time, so we stub window before the dynamic import.

import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
const { shouldSeek } = await import('./player.js');

test('shouldSeek skips tiny and out-of-range fractions', () => {
  assert.equal(shouldSeek(0), false);      // nothing stored / fresh start
  assert.equal(shouldSeek(0.019), false);  // below 2% threshold: resume noise
  assert.equal(shouldSeek(0.02), true);    // at threshold: seek
  assert.equal(shouldSeek(0.5), true);     // mid-talk: seek
  assert.equal(shouldSeek(1), false);      // never persists, guarded anyway
});
