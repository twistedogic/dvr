// site/layout.test.mjs: smoke test for the iPhone 12 layout rules in
// site/style.css. CSS is the spec for visual layout; this file catches
// accidental regressions when style.css is edited later. Visual
// verification (centering on a real device) is still the human step -
// see the iphone12-layout change for the manual checklist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, 'style.css'), 'utf8');

test('#app uses safe-area-aware padding and a 16px gap', () => {
  assert.match(
    css,
    /#app\s*\{[^}]*padding:\s*calc\(env\(safe-area-inset-top\)\s*\+\s*16px\)\s+16px\s+calc\(env\(safe-area-inset-bottom\)\s*\+\s*32px\)/,
    'expected #app padding to use env(safe-area-inset-top/bottom) with base offsets',
  );
  assert.match(css, /#app\s*\{[^}]*gap:\s*16px/, 'expected #app gap to be 16px');
});

test('h1 and h2 are smaller and centered', () => {
  assert.match(css, /h1\s*\{[^}]*font-size:\s*1\.25rem/, 'expected h1 font-size 1.25rem');
  assert.match(css, /h1\s*\{[^}]*text-align:\s*center/, 'expected h1 text-align center');
  assert.match(css, /h2\s*\{[^}]*font-size:\s*1rem/, 'expected h2 font-size 1rem');
  assert.match(css, /h2\s*\{[^}]*text-align:\s*center/, 'expected h2 text-align center');
});

test('button is tighter and the IDLE button row is centered', () => {
  assert.match(css, /button\s*\{[^}]*padding:\s*12px\s+24px/, 'expected button padding 12/24');
  assert.match(css, /button\s*\{[^}]*font-size:\s*1rem/, 'expected button font-size 1rem');
  assert.match(css, /button\s*\{[^}]*min-width:\s*160px/, 'expected button min-width 160px');
  assert.match(css, /\.talk-card\s*\{[^}]*align-items:\s*center/, 'expected .talk-card align-items: center');
  assert.match(css, /\.talk-card\s+\.actions\s*\{[^}]*justify-content:\s*center/, 'expected .talk-card .actions justify-content: center');
});

test('thumbnail keeps full container width via align-self: stretch', () => {
  assert.match(css, /\.talk-card\s+img\s*\{[^}]*width:\s*100%/, 'expected .talk-card img width: 100%');
  assert.match(css, /\.talk-card\s+img\s*\{[^}]*align-self:\s*stretch/, 'expected .talk-card img align-self: stretch to override parent align-items: center');
});

test('browse-list keeps left-aligned full-width buttons', () => {
  assert.match(css, /\.browse-list\s+button\s*\{[^}]*text-align:\s*left/, 'expected browse buttons to stay left-aligned');
  assert.match(css, /\.browse-list\s+button\s*\{[^}]*font-size:\s*0\.95rem/, 'expected browse button font-size 0.95rem');
});