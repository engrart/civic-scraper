/**
 * Local Seattle-area news scrapers via RSS
 * Sources: Seattle Times, The Stranger, Crosscut, West Seattle Blog, MyNorthwest
 */
import Parser from 'rss-parser';
import fetch from 'node-fetch';
import { cleanText, parseDate } from '../utils/fetch.js';

const rssParser = new Parser();

const RSS_REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
};

// Political keyword filter — only surface politically relevant stories
const POLITICAL_KEYWORDS = /council|mayor|elect|vote|ballot|ordinance|budget|tax|police|transit|housing|zoning|permit|campaign|candidate|democrat|republican|progressive|levy|bond|district|senator|representative|governor|school board|port commissioner|initiative|referendum|recall/i;

const SOURCES = [
  {
    name: 'The Stranger',
    url: 'https://www.thestranger.com/seattle/Rss.xml',
    city: 'seattle',
    tags: ['the-stranger', 'news'],
  },
  {
    name: 'Crosscut Politics',
    url: 'https://crosscut.com/politics/feed',
    city: 'seattle',
    tags: ['crosscut', 'news'],
  },
  {
    name: 'MyNorthwest Local',
    url: 'https://mynorthwest.com/category/local/feed/',
    city: 'seattle',
    tags: ['mynorthwest', 'news'],
  },
  {
    name: 'West Seattle Blog',
    url: 'https://westseattleblog.com/feed/',
    city: 'seattle',
    tags: ['west-seattle', 'neighborhood'],
  },
  {
    name: 'PubliCola',
    url: 'https://publicola.com/feed/',
    city: 'seattle',
    tags: ['publicola', 'policy', 'news'],
  },
];

async function scrapeSource(source) {
  // Fetch raw XML ourselves to avoid the url.parse() deprecation inside rss-parser,
  // and sanitize unescaped ampersands so malformed feeds (e.g. The Stranger) don't fail.
  const res = await fetch(source.url, { headers: RSS_REQUEST_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  const sanitized = raw.replace(/&(?!(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]\w*);)/g, '&amp;');
  const feed = await rssParser.parseString(sanitized);

  return feed.items
    .slice(0, 20)
    .filter(item => {
      const text = `${item.title} ${item.contentSnippet || ''}`;
      return POLITICAL_KEYWORDS.test(text);
    })
    .map(item => ({
      source_url: item.link || item.guid,
      source_name: source.name,
      title: cleanText(item.title),
      body: cleanText(item.contentSnippet || item.content || ''),
      category: 'news',
      city: source.city,
      event_date: null,
      published_at: parseDate(item.pubDate || item.isoDate),
      tags: source.tags,
      politicians: [],
    }))
    .filter(i => i.source_url);
}

export async function scrapeAll() {
  const results = await Promise.allSettled(SOURCES.map(s => scrapeSource(s)));

  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn(`  RSS failed for ${SOURCES[i].name}: ${r.reason?.message}`);
    return [];
  });
}
