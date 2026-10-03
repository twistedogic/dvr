// build-catalog.mjs: fetch YouTube RSS for each whitelisted channel and
// emit site/catalog.json. Run by hand; not part of the runtime PWA.
//
// Usage: node scripts/build-catalog.mjs scripts/channels.txt site/catalog.json
//
// Exposes parseFeed(xml) and build({feeds}) for tests.

import * as fs from 'node:fs/promises';
import * as https from 'node:https';

// Regex-based Atom XML extraction. Atom is simple enough that a hand-rolled
// parser is fine and avoids an XML dependency.

// Match the first <yt:channelId>...</yt:channelId> in the feed.
const RE_CHANNEL_ID = /<yt:channelId>([^<]+)<\/yt:channelId>/;
// Match the first <title>...</title> at the feed level (not inside an entry).
// The feed-level title appears before the first <entry>.
const RE_FEED_TITLE = /<title>([^<]+)<\/title>/;

// Match one <entry>...</entry> block. The "s" flag lets "." span newlines.
const RE_ENTRY = /<entry>([\s\S]*?)<\/entry>/g;
// Within an entry: videoId, title, the alternate link's href, published, thumbnail url.
const RE_VIDEO_ID = /<yt:videoId>([^<]+)<\/yt:videoId>/;
const RE_TITLE = /<title>([^<]+)<\/title>/;
// The alternate <link> is the one with rel="alternate". We look for that exact
// attribute form so we don't pick up the self or hub links.
const RE_ALT_HREF = /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/;
const RE_PUBLISHED = /<published>([^<]+)<\/published>/;
const RE_THUMB = /<media:thumbnail[^>]*url="([^"]+)"/;

/**
 * Parse one RSS feed's XML.
 * @param {string} xml
 * @returns {{channel: {id: string, name: string}, talks: Array<{id: string, title: string, channel: string, published: string, thumbnail_url: string}>}}
 */
export function parseFeed(xml) {
  const channelId = (RE_CHANNEL_ID.exec(xml) || [])[1] || '';
  const channelName = (RE_FEED_TITLE.exec(xml) || [])[1] || '';
  const talks = [];
  for (const m of xml.matchAll(RE_ENTRY)) {
    const block = m[1];
    const id = (RE_VIDEO_ID.exec(block) || [])[1];
    const title = (RE_TITLE.exec(block) || [])[1];
    const altHref = (RE_ALT_HREF.exec(block) || [])[1];
    const published = (RE_PUBLISHED.exec(block) || [])[1];
    const thumb = (RE_THUMB.exec(block) || [])[1];
    if (!id || !altHref) continue;
    if (altHref.includes('/shorts/')) continue; // drop Shorts
    talks.push({
      id,
      title: title || '',
      channel: channelName,
      published: published || '',
      thumbnail_url: thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  }
  return {
    channel: { id: channelId, name: channelName },
    talks,
  };
}

/**
 * Build a catalog from a list of {channelId, xml} pairs.
 * @param {{feeds: Array<{channelId: string, xml: string}>}} args
 */
export function build({ feeds }) {
  const channels = [];
  const talks = [];
  for (const { channelId, xml } of feeds) {
    const parsed = parseFeed(xml);
    if (!parsed.channel.id) parsed.channel.id = channelId;
    channels.push(parsed.channel);
    for (const t of parsed.talks) talks.push(t);
  }
  return {
    generated_at: new Date().toISOString(),
    channels,
    talks,
  };
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dvr-build/1.0' } }, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function readAllowlist(path) {
  return fs.readFile(path, 'utf8').then((text) =>
    text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      // strip an inline "# comment" suffix
      .map((l) => l.split(/\s+#/)[0].trim())
      // each line should be a single channel id token
      .map((l) => l.split(/\s+/)[0])
      .filter((l) => /^UC[A-Za-z0-9_-]{20,22}$/.test(l)),
  );
}

async function main() {
  const [, , allowlistPath, outPath] = process.argv;
  if (!allowlistPath || !outPath) {
    console.error('Usage: node scripts/build-catalog.mjs <allowlist> <out.json>');
    process.exit(2);
  }
  const ids = await readAllowlist(allowlistPath);
  const feeds = [];
  for (const id of ids) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
    process.stderr.write(`fetching ${id} ... `);
    try {
      const xml = await fetchText(url);
      feeds.push({ channelId: id, xml });
      const n = (xml.match(/<entry>/g) || []).length;
      process.stderr.write(`ok (${n} entries)\n`);
    } catch (e) {
      process.stderr.write(`FAIL: ${e.message}\n`);
    }
  }
  const catalog = build({ feeds });
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2) + '\n');
  process.stderr.write(
    `wrote ${outPath}: ${catalog.channels.length} channels, ${catalog.talks.length} talks\n`,
  );
}

// Run main() only when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
