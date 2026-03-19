/**
 * Burien City Council scraper
 * Sources: CivicWeb meeting portal, Burien homepage news links, B-Town Blog RSS
 *
 * NOTE: Burien redesigned their site to www.burienwa.gov (CivicLive CMS).
 * The old /government/city-council/agendas-minutes path is gone.
 * News listings are JS-rendered portlets; article links come from the homepage.
 * Meetings are on the CivicWeb portal at burienwa.civicweb.net.
 */
import { cleanText, parseDate } from '../utils/fetch.js';
import Parser from 'rss-parser';
import fetch from 'node-fetch';

const rssParser = new Parser();
export const SOURCE_NAME = 'Burien City Council';

const BURIEN_BASE = 'https://www.burienwa.gov';
const CIVICWEB_BASE = 'https://burienwa.civicweb.net';

async function parseRssFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  const sanitized = raw.replace(/&(?!(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]\w*);)/g, '&amp;');
  return rssParser.parseString(sanitized);
}

/**
 * Scrape upcoming Burien City Council meetings from the CivicWeb portal.
 */
export async function scrapeBurienMeetings() {
  const r = await fetch(`${CIVICWEB_BASE}/Portal/MeetingInformation.aspx?type=10`, { redirect: 'follow' });
  if (!r.ok) return [];
  const html = await r.text();

  // Meeting entries are <button id="ctl00_MainContent_MeetingButtonXXXX"> elements
  // containing <div class="meeting-list-item-button-date">DD Mon YYYY</div><div>Title</div>
  const meetings = [...html.matchAll(
    /id="ctl00_MainContent_MeetingButton(\d+)"[^>]*>.*?<div class="meeting-list-item-button-date">([^<]+)<\/div><div>([^<]*)<\/div>/gis
  )];

  return meetings.slice(0, 8).map(([, id, date, title]) => ({
    source_url: `${CIVICWEB_BASE}/Portal/MeetingInformation.aspx?Id=${id}`,
    source_name: SOURCE_NAME,
    title: `${title.trim() || 'Burien City Council Meeting'}: ${date.trim()}`,
    body: `${title.trim()} — ${date.trim()}. Agenda and supporting documents available online.`,
    category: 'meeting',
    city: 'burien',
    event_date: parseDate(date.trim()),
    published_at: parseDate(date.trim()),
    tags: ['city-council', 'burien'],
    politicians: [],
  }));
}

/**
 * Scrape Burien news announcements.
 * The news listing page is JS-rendered (CivicLive portlet), but the homepage
 * includes static hrefs to recent news articles.
 */
export async function scrapeBurienNews() {
  try {
    const r = await fetch(BURIEN_BASE + '/');
    if (!r.ok) return [];
    const html = await r.text();

    const articleHrefs = [...new Set(
      [...html.matchAll(/href="(\/news_events\/city_newsroom\/news_announcements\/[^"/]+)"/gi)]
        .map(m => m[1])
    )];

    return articleHrefs.slice(0, 8).map(href => {
      const slug = href.split('/').pop();
      const title = slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return {
        source_url: `${BURIEN_BASE}${href}`,
        source_name: 'Burien City News',
        title,
        body: title,
        category: 'news',
        city: 'burien',
        event_date: null,
        published_at: new Date().toISOString(),
        tags: ['burien', 'city-news'],
        politicians: [],
      };
    });
  } catch {
    return [];
  }
}

/**
 * Scrape The B-Town Blog (Burien-focused local news).
 */
export async function scrapeBTownBlog() {
  try {
    const feed = await parseRssFromUrl('https://b-townblog.com/feed/');
    return feed.items.slice(0, 15).map(item => ({
      source_url: item.link || item.guid,
      source_name: 'B-Town Blog',
      title: cleanText(item.title),
      body: cleanText(item.contentSnippet || ''),
      category: 'news',
      city: 'burien',
      event_date: null,
      published_at: parseDate(item.pubDate || item.isoDate),
      tags: ['burien', 'local-news'],
      politicians: [],
    })).filter(i => i.source_url);
  } catch {
    return [];
  }
}

export async function scrapeAll() {
  const [meetings, news, blog] = await Promise.allSettled([
    scrapeBurienMeetings(),
    scrapeBurienNews(),
    scrapeBTownBlog(),
  ]);

  return [
    ...(meetings.value || []),
    ...(news.value || []),
    ...(blog.value || []),
  ];
}
