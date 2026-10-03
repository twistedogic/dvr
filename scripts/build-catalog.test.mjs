// Tests for build-catalog.mjs. Run with: node --test scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, build } from './build-catalog.mjs';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <yt:channelId>UCabc123</yt:channelId>
 <title>Test Conference</title>
 <author><name>Test Conference</name><uri>https://www.youtube.com/channel/UCabc123</uri></author>
 <entry>
  <id>yt:video:aaaa1111</id>
  <yt:videoId>aaaa1111</yt:videoId>
  <title>Talk One by Alice</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=aaaa1111"/>
  <published>2025-01-15T10:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i1.ytimg.com/vi/aaaa1111/hqdefault.jpg"/>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:bbbb2222</id>
  <yt:videoId>bbbb2222</yt:videoId>
  <title>Talk Two by Bob</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=bbbb2222"/>
  <published>2025-02-20T11:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i1.ytimg.com/vi/bbbbb2222/hqdefault.jpg"/>
  </media:group>
 </entry>
</feed>`;

const SAMPLE_WITH_SHORT = SAMPLE_XML.replace(
  '<entry>\n  <id>yt:video:bbbb2222</id>',
  `<entry>
  <id>yt:video:cccc3333</id>
  <yt:videoId>cccc3333</yt:videoId>
  <title>Short Clip</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/cccc3333"/>
  <published>2025-03-01T00:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i1.ytimg.com/vi/cccc3333/hqdefault.jpg"/>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:bbbb2222</id>`,
);

test('parseFeed returns {channel, talks[]} with the expected fields', () => {
  const out = parseFeed(SAMPLE_XML);
  assert.equal(out.channel.id, 'UCabc123');
  assert.equal(out.channel.name, 'Test Conference');
  assert.equal(out.talks.length, 2);
  assert.equal(out.talks[0].id, 'aaaa1111');
  assert.equal(out.talks[0].title, 'Talk One by Alice');
  assert.equal(out.talks[0].channel, 'Test Conference');
  assert.equal(out.talks[0].published, '2025-01-15T10:00:00+00:00');
  assert.equal(out.talks[0].thumbnail_url, 'https://i1.ytimg.com/vi/aaaa1111/hqdefault.jpg');
});

test('parseFeed drops entries whose alternate link is a Short', () => {
  const out = parseFeed(SAMPLE_WITH_SHORT);
  assert.equal(out.talks.length, 2);
  for (const t of out.talks) {
    assert.ok(!t.id.startsWith('cccc'), 'short entry leaked through');
  }
});

test('build({feeds}) returns {generated_at, channels, talks} combining all feeds', () => {
  const out = build({
    feeds: [
      { channelId: 'UCabc123', xml: SAMPLE_XML },
      { channelId: 'UCxyz999', xml: SAMPLE_XML.replace(/UCabc123/g, 'UCxyz999').replace(/Test Conference/g, 'Other Conf') },
    ],
  });
  assert.ok(typeof out.generated_at === 'string' && out.generated_at.length > 0);
  assert.equal(out.channels.length, 2);
  assert.equal(out.channels[0].id, 'UCabc123');
  assert.equal(out.channels[0].name, 'Test Conference');
  assert.equal(out.channels[1].name, 'Other Conf');
  assert.equal(out.talks.length, 4);
});
