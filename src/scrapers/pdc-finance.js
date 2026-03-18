/**
 * Washington PDC (Public Disclosure Commission) scraper
 * Scrapes local campaign finance filings, fundraising events
 * PDC has an open API: https://www.pdc.wa.gov/browse/open-data
 */
import { fetchJSON, cleanText, parseDate } from '../utils/fetch.js';

const PDC_API = 'https://data.wa.gov/resource';

export const SOURCE_NAME = 'WA Public Disclosure Commission';

// Jurisdiction codes for Seattle and Burien
const LOCAL_JURISDICTIONS = ['Seattle', 'Burien', 'King County'];

/**
 * Fetch recent campaign contributions for local races.
 * Uses WA State open data Socrata API.
 */
export async function scrapeContributions() {
  // C3 = contributions to candidates
  const url = `${PDC_API}/f60w-2veh.json?$limit=50&$order=receipt_date DESC&$where=jurisdiction_type='local government' AND (jurisdiction='Seattle' OR jurisdiction='Burien' OR jurisdiction like '%King County%')`;

  let data;
  try {
    data = await fetchJSON(url);
  } catch {
    return []; // PDC API may be rate-limited
  }

  // Group by candidate to avoid flooding the feed
  const byCandidateMap = new Map();
  for (const row of data) {
    const key = row.candidate_name || row.filer_name;
    if (!byCandidateMap.has(key)) {
      byCandidateMap.set(key, { ...row, totalContributions: 0, count: 0 });
    }
    const entry = byCandidateMap.get(key);
    entry.totalContributions += parseFloat(row.amount || 0);
    entry.count += 1;
  }

  return Array.from(byCandidateMap.values()).map(row => {
    const jurisdiction = row.jurisdiction || '';
    const city = jurisdiction.toLowerCase().includes('burien') ? 'burien' : 'seattle';

    return {
      source_url: `https://www.pdc.wa.gov/browse/campaign-explorer/candidate?filer_id=${row.filer_id}`,
      source_name: SOURCE_NAME,
      title: `Campaign Finance: ${row.candidate_name || row.filer_name} — $${Math.round(row.totalContributions).toLocaleString()} in recent contributions`,
      body: [
        `Candidate/Filer: ${row.candidate_name || row.filer_name}`,
        `Office: ${row.office || 'Unknown'}`,
        `Jurisdiction: ${row.jurisdiction}`,
        `Recent contributions: ${row.count} totaling $${row.totalContributions.toFixed(2)}`,
        `Election year: ${row.election_year || 'N/A'}`,
      ].join('\n'),
      category: 'filing',
      city,
      event_date: null,
      published_at: parseDate(row.receipt_date),
      tags: ['campaign-finance', 'pdc', city],
      politicians: [row.candidate_name || row.filer_name].filter(Boolean),
    };
  });
}

/**
 * Fetch candidate filings (C1 forms — new candidate declarations).
 */
export async function scrapeCandidateFilings() {
  const url = `${PDC_API}/d4ke-x5ki.json?$limit=20&$order=filed_date DESC&$where=jurisdiction_type='local government' AND (jurisdiction='Seattle' OR jurisdiction='Burien')`;

  let data;
  try {
    data = await fetchJSON(url);
  } catch {
    return [];
  }

  return data.map(row => {
    const city = (row.jurisdiction || '').toLowerCase().includes('burien') ? 'burien' : 'seattle';
    return {
      source_url: `https://www.pdc.wa.gov/browse/campaign-explorer/candidate?filer_id=${row.filer_id}`,
      source_name: SOURCE_NAME,
      title: `New Candidate Filing: ${row.candidate_name} for ${row.office}`,
      body: [
        `${row.candidate_name} filed to run for ${row.office}`,
        `Party: ${row.party || 'Nonpartisan'}`,
        `Jurisdiction: ${row.jurisdiction}`,
        `Filed: ${row.filed_date}`,
      ].join('\n'),
      category: 'filing',
      city,
      event_date: null,
      published_at: parseDate(row.filed_date),
      tags: ['candidate-filing', 'election', city],
      politicians: [row.candidate_name].filter(Boolean),
    };
  });
}

export async function scrapeAll() {
  const [contributions, filings] = await Promise.allSettled([
    scrapeContributions(),
    scrapeCandidateFilings(),
  ]);

  return [
    ...(contributions.value || []),
    ...(filings.value || []),
  ];
}
