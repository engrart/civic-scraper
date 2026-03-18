/**
 * Burien City Council scraper
 * Sources: Burien city website agendas, meeting minutes
 */
import { fetchHTML, cleanText, parseDate } from '../utils/fetch.js';
import Parser from 'rss-parser';

const rssParser = new Parser();
export const SOURCE_NAME = 'Burien City Council';

const BASE_URL = 'https://burienwa.gov';

/**
 * Scrape upcoming Burien City Council agendas/meetings.
 */
export async function scrapeBurienMeetings() {
  const $ = await fetchHTML(`${BASE_URL}/government/city-council/agendas-minutes`);
  const items = [];

  // Burien posts agendas as links on their agendas-minutes page
  $('a[href*="agenda"], a[href*="Agenda"]').each((i, el) => {
    const $el = $(el);
    const title = cleanText($el.text());
    const href = $el.attr('href');
    if (!title || !href || title.length < 5) return;

    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    items.push({
      source_url: url,
      source_name: SOURCE_NAME,
      title: title.includes('Agenda') ? title : `Burien City Council Agenda: ${title}`,
      body: title,
      category: 'meeting',
      city: 'burien',
      event_date: null,
      published_at: new Date().toISOString(),
      tags: ['city-council', 'agenda'],
      politicians: [],
    });
  });

  return items.slice(0, 10);
}

/**
 * Scrape Burien news/press releases.
 */
export async function scrapeBurienNews() {
  try {
    // Try their news RSS if available
    const feed = await rssParser.parseURL(`${BASE_URL}/feed`);
    return feed.items.slice(0, 15).map(item => ({
      source_url: item.link || item.guid,
      source_name: 'Burien City News',
      title: cleanText(item.title),
      body: cleanText(item.contentSnippet || item.content || ''),
      category: 'news',
      city: 'burien',
      event_date: null,
      published_at: parseDate(item.pubDate || item.isoDate),
      tags: ['burien', 'city-news'],
      politicians: [],
    })).filter(i => i.source_url);
  } catch {
    return [];
  }
}

/**
 * Scrape The B-Town Blog (Burien-focused local news).
 */
export async function scrapeBTownBlog() {
  try {
    const feed = await rssParser.parseURL('https://b-townblog.com/feed/');
    return feed.items.slice(0, 15)
      .filter(item => {
        const text = (item.title + ' ' + item.contentSnippet).toLowerCase();
        // Filter for politically relevant posts
        return text.match(/council|mayor|elect|vote|budget|police|parks|ordinance|city hall|candidate/);
      })
      .map(item => ({
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
