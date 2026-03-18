/**
 * Seattle City Council scraper
 * Scrapes: upcoming meetings, agendas, recent legislation
 */
import { fetchHTML, fetchJSON, cleanText, parseDate } from '../utils/fetch.js';
import Parser from 'rss-parser';
import fetch from 'node-fetch';

const rssParser = new Parser();

async function parseRssFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  const sanitized = raw.replace(/&(?!(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]\w*);)/g, '&amp;');
  return rssParser.parseString(sanitized);
}

export const SOURCE_NAME = 'Seattle City Council';

/**
 * Scrape upcoming council meetings from the Legistar API (Seattle uses Legistar).
 * Legistar has an open JSON API — no scraping needed.
 */
export async function scrapeCouncilMeetings() {
  const url = 'https://webapi.legistar.com/v1/seattle/events?$top=20&$orderby=EventDate desc';
  const data = await fetchJSON(url);

  return data.map(event => ({
    source_url: `https://seattle.legistar.com/MeetingDetail.aspx?ID=${event.EventId}`,
    source_name: SOURCE_NAME,
    title: `${event.EventBodyName}: ${event.EventAgendaStatusName}`,
    body: [
      event.EventBodyName,
      event.EventLocation,
      event.EventAgendaFile ? `Agenda: ${event.EventAgendaFile}` : '',
    ].filter(Boolean).join('\n'),
    category: 'meeting',
    city: 'seattle',
    event_date: parseDate(event.EventDate),
    published_at: parseDate(event.EventDate),
    tags: ['city-council'],
    politicians: [],
  }));
}

/**
 * Scrape recent Seattle legislation/bills from Legistar.
 */
export async function scrapeRecentLegislation() {
  const url = 'https://webapi.legistar.com/v1/seattle/matters?$top=20&$orderby=MatterLastModifiedUtc desc';
  const data = await fetchJSON(url);

  return data
    .filter(m => m.MatterTitle && m.MatterStatusName !== 'Adopted') // skip old closed items
    .map(matter => ({
      source_url: `https://seattle.legistar.com/LegislationDetail.aspx?ID=${matter.MatterId}`,
      source_name: SOURCE_NAME,
      title: cleanText(matter.MatterTitle),
      body: [
        matter.MatterTypeName,
        matter.MatterTitle,
        matter.MatterBodyName ? `Body: ${matter.MatterBodyName}` : '',
        matter.MatterStatusName ? `Status: ${matter.MatterStatusName}` : '',
      ].filter(Boolean).join('\n'),
      category: 'vote',
      city: 'seattle',
      event_date: null,
      published_at: parseDate(matter.MatterLastModifiedUtc),
      tags: ['legislation', matter.MatterTypeName?.toLowerCase().replace(/\s+/g, '-')].filter(Boolean),
      politicians: [],
    }));
}

/**
 * Scrape Seattle Channel (council meeting videos/news) via RSS.
 */
export async function scrapeSeattleChannel() {
  try {
    const feed = await parseRssFromUrl('https://www.seattlechannel.org/rss.xml');
    return feed.items.slice(0, 15).map(item => ({
      source_url: item.link || item.guid,
      source_name: 'Seattle Channel',
      title: cleanText(item.title),
      body: cleanText(item.contentSnippet || item.content || ''),
      category: 'meeting',
      city: 'seattle',
      event_date: null,
      published_at: parseDate(item.pubDate || item.isoDate),
      tags: ['city-council', 'video'],
      politicians: [],
    })).filter(i => i.source_url);
  } catch {
    return []; // RSS might not be available
  }
}

export async function scrapeAll() {
  const [meetings, legislation, channel] = await Promise.allSettled([
    scrapeCouncilMeetings(),
    scrapeRecentLegislation(),
    scrapeSeattleChannel(),
  ]);

  return [
    ...(meetings.value || []),
    ...(legislation.value || []),
    ...(channel.value || []),
  ];
}
