// civic/supabase/functions/scraper/index.ts
// Supabase Edge Function — runs on Deno, no npm needed
// Triggered by pg_cron every 12 hours

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

// ─── SCRAPERS ────────────────────────────────────────────────────────────────

async function scrapeSeattleCouncil() {
  const items: any[] = [];

  // Meetings
  try {
    const res = await fetch(
      'https://webapi.legistar.com/v1/seattle/events?$top=20&$orderby=EventDate desc'
    );
    const events = await res.json();
    for (const e of events) {
      items.push({
        source_url: e.EventInSiteURL || `https://seattle.legistar.com/MeetingDetail.aspx?LEGID=${e.EventId}&GID=393&G=${e.EventGuid}`,
        source_name: 'Seattle City Council',
        title: `${e.EventBodyName}: ${e.EventAgendaStatusName}`,
        body: [e.EventBodyName, e.EventLocation].filter(Boolean).join('\n'),
        category: 'meeting',
        city: 'seattle',
        event_date: e.EventDate ?? null,
        published_at: e.EventDate ?? null,
        tags: ['city-council'],
        politicians: [],
      });
    }
  } catch (e) { console.error('Seattle meetings error:', e); }

  // Legislation
  try {
    const res = await fetch(
      'https://webapi.legistar.com/v1/seattle/matters?$top=20&$orderby=MatterLastModifiedUtc desc'
    );
    const matters = await res.json();
    for (const m of matters) {
      if (!m.MatterTitle) continue;
      // LegislationDetail.aspx is blocked on Seattle's Legistar (returns "Invalid parameters!").
      // Fall back to the search page which at least pre-fills the query.
      items.push({
        source_url: `https://seattle.legistar.com/Legislation.aspx?Search=${encodeURIComponent(m.MatterFile || m.MatterTitle || '')}`,
        source_name: 'Seattle City Council',
        title: m.MatterTitle.trim(),
        body: [m.MatterTypeName, m.MatterTitle, `Status: ${m.MatterStatusName}`].join('\n'),
        category: 'vote',
        city: 'seattle',
        event_date: null,
        published_at: m.MatterLastModifiedUtc ?? null,
        tags: ['legislation'],
        politicians: [],
      });
    }
  } catch (e) { console.error('Seattle legislation error:', e); }

  return items;
}

async function scrapePDC() {
  const items: any[] = [];
  try {
    const url = `https://data.wa.gov/resource/f60w-2veh.json?$limit=30&$order=receipt_date DESC&$where=jurisdiction_type='local government' AND (jurisdiction='Seattle' OR jurisdiction='Burien')`;
    const res = await fetch(url);
    const data = await res.json();

    const map = new Map<string, any>();
    for (const row of data) {
      const key = row.candidate_name || row.filer_name;
      if (!map.has(key)) map.set(key, { ...row, total: 0, count: 0 });
      map.get(key).total += parseFloat(row.amount || 0);
      map.get(key).count += 1;
    }

    for (const row of map.values()) {
      const city = (row.jurisdiction || '').toLowerCase().includes('burien') ? 'burien' : 'seattle';
      items.push({
        source_url: `https://www.pdc.wa.gov/browse/campaign-explorer/candidate?filer_id=${row.filer_id}`,
        source_name: 'WA Public Disclosure Commission',
        title: `Campaign Finance: ${row.candidate_name || row.filer_name} — $${Math.round(row.total).toLocaleString()} in recent contributions`,
        body: `Candidate: ${row.candidate_name || row.filer_name}\nOffice: ${row.office || 'Unknown'}\nJurisdiction: ${row.jurisdiction}`,
        category: 'filing',
        city,
        event_date: null,
        published_at: row.receipt_date ?? null,
        tags: ['campaign-finance', 'pdc'],
        politicians: [row.candidate_name || row.filer_name].filter(Boolean),
      });
    }
  } catch (e) { console.error('PDC error:', e); }
  return items;
}

async function scrapeRSS(name: string, url: string, city: string, tags: string[]) {
  const POLITICAL = /council|mayor|elect|vote|ballot|ordinance|budget|tax|police|transit|housing|zoning|campaign|candidate|levy|bond|initiative|referendum/i;
  const items: any[] = [];
  try {
    const res = await fetch(url);
    const xml = await res.text();
    const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    for (const match of blocks) {
      const b = match[1];
      const title   = (b.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
      const link    = (b.match(/<link>(.*?)<\/link>/)?.[1] ?? '').trim();
      const desc    = (b.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/)?.[1] ?? '').replace(/<[^>]+>/g, '').slice(0, 400).trim();
      const pubDate = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? null;
      if (!title || !link) continue;
      if (!POLITICAL.test(title + ' ' + desc)) continue;
      items.push({
        source_url: link,
        source_name: name,
        title,
        body: desc,
        category: 'news',
        city,
        event_date: null,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        tags,
        politicians: [],
      });
    }
  } catch (e) { console.error(`RSS error ${name}:`, e); }
  return items.slice(0, 15);
}

async function scrapeAllNews() {
  const sources = [
    { name: 'The Stranger',      url: 'https://www.thestranger.com/seattle/RSSFeed?department=News', city: 'seattle', tags: ['the-stranger'] },
    { name: 'Crosscut',          url: 'https://crosscut.com/politics/feed',                          city: 'seattle', tags: ['crosscut']     },
    { name: 'PubliCola',         url: 'https://publicola.com/feed/',                                 city: 'seattle', tags: ['publicola']    },
    { name: 'West Seattle Blog', url: 'https://westseattleblog.com/feed/',                           city: 'seattle', tags: ['west-seattle'] },
    { name: 'B-Town Blog',       url: 'https://b-townblog.com/feed/',                               city: 'burien',  tags: ['b-town']       },
  ];
  const results = await Promise.allSettled(sources.map(s => scrapeRSS(s.name, s.url, s.city, s.tags)));
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// ─── AI ENRICHMENT ───────────────────────────────────────────────────────────

async function enrichItem(item: any) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a civic assistant. Return ONLY valid JSON with no markdown:
{
  "summary": "2-sentence plain-English summary of what this is and why it matters",
  "category": "meeting|vote|event|news|fundraiser|filing|other",
  "city": "seattle|burien|king_county|regional|other",
  "tags": ["tag1","tag2"],
  "politicians": ["Full Name"],
  "importance_score": 5
}`,
      messages: [{ role: 'user', content: `Title: ${item.title}\nSource: ${item.source_name}\nBody: ${(item.body || '').slice(0, 600)}` }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { ...item, ...parsed };
  } catch (e) {
    console.error(`Enrichment failed for "${item.title}":`, e);
    return item;
  }
}

async function enrichBatch(items: any[]) {
  const out = [];
  for (let i = 0; i < items.length; i += 5) {
    const chunk = items.slice(i, i + 5);
    const results = await Promise.allSettled(chunk.map(enrichItem));
    for (let j = 0; j < results.length; j++) {
      out.push(results[j].status === 'fulfilled' ? results[j].value : chunk[j]);
    }
    if (i + 5 < items.length) await new Promise(r => setTimeout(r, 300));
  }
  return out;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  console.log(`Scraper started at ${new Date().toISOString()}`);

  // 1. Scrape all sources
  const [council, pdc, news] = await Promise.allSettled([
    scrapeSeattleCouncil(),
    scrapePDC(),
    scrapeAllNews(),
  ]);

  const raw = [
    ...(council.status === 'fulfilled' ? council.value : []),
    ...(pdc.status    === 'fulfilled' ? pdc.value    : []),
    ...(news.status   === 'fulfilled' ? news.value   : []),
  ];
  console.log(`Raw items scraped: ${raw.length}`);

  // 2. Deduplicate against DB
  const urls = raw.map((i: any) => i.source_url).filter(Boolean);
  const { data: existing } = await supabase
    .from('civic_items')
    .select('source_url')
    .in('source_url', urls);

  const existingSet = new Set((existing ?? []).map((r: any) => r.source_url));
  const newItems = raw.filter((i: any) => i.source_url && !existingSet.has(i.source_url));
  console.log(`New items (not in DB): ${newItems.length}`);

  if (newItems.length === 0) {
    return new Response(JSON.stringify({ status: 'ok', inserted: 0, message: 'Nothing new' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. AI enrichment
  console.log('Running AI enrichment...');
  const enriched = await enrichBatch(newItems);

  // 4. Save to Supabase
  const { data, error } = await supabase
    .from('civic_items')
    .upsert(enriched, { onConflict: 'source_url', ignoreDuplicates: true })
    .select('id');

  if (error) console.error('Upsert error:', error);

  const inserted = data?.length ?? 0;
  console.log(`Done. Inserted: ${inserted}`);

  return new Response(
    JSON.stringify({ status: 'ok', raw: raw.length, new: newItems.length, inserted }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
