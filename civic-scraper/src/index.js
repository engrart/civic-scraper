/**
 * civic-scraper — main orchestrator
 *
 * Runs all scrapers, deduplicates against DB, enriches with AI, saves to Supabase.
 * Can be run once (--once flag) or on a cron schedule.
 */
import 'dotenv/config';
import cron from 'node-cron';

import { safeRun } from './utils/fetch.js';
import { scrapeAll as scrapeSeattleCouncil } from './scrapers/seattle-council.js';
import { scrapeAll as scrapeBurienCouncil } from './scrapers/burien-council.js';
import { scrapeAll as scrapePDC } from './scrapers/pdc-finance.js';
import { scrapeAll as scrapeLocalNews } from './scrapers/local-news.js';
import { enrichBatch } from './enrichment/ai-enricher.js';
import { upsertItems, updateVoteResults, getExistingUrls, startScrapeRun, finishScrapeRun } from './db/client.js';

const SCRAPERS = [
  { name: 'Seattle City Council', fn: scrapeSeattleCouncil },
  { name: 'Burien City Council', fn: scrapeBurienCouncil },
  { name: 'PDC Campaign Finance', fn: scrapePDC },
  { name: 'Local News RSS', fn: scrapeLocalNews },
];

async function runScrape() {
  console.log(`\n🏛️  Civic Scraper starting — ${new Date().toLocaleString()}`);
  const runId = await startScrapeRun();
  const allErrors = [];
  let totalFound = 0;
  let totalInserted = 0;

  // 1. Run all scrapers in parallel
  console.log('\n📡 Scraping sources...');
  const scrapeResults = await Promise.all(
    SCRAPERS.map(({ name, fn }) => safeRun(name, fn))
  );

  // 2. Flatten all results
  const rawItems = scrapeResults.flatMap(r => {
    if (r.error) allErrors.push({ source: r.name, error: r.error });
    return r.results;
  });

  console.log(`\n📦 Total raw items collected: ${rawItems.length}`);
  totalFound = rawItems.length;

  if (rawItems.length === 0) {
    console.log('Nothing to process.');
    await finishScrapeRun(runId, { sources_attempted: SCRAPERS.length, items_found: 0, items_inserted: 0, errors: allErrors });
    return;
  }

  // 3. Deduplicate against existing DB records
  const allUrls = rawItems.map(i => i.source_url).filter(Boolean);
  const existingUrls = await getExistingUrls(allUrls);
  const newItems = rawItems.filter(i => i.source_url && !existingUrls.has(i.source_url));
  const existingItems = rawItems.filter(i => i.source_url && existingUrls.has(i.source_url));

  console.log(`🔍 New items (not yet in DB): ${newItems.length} / ${rawItems.length}`);

  // Update vote_result on already-existing items (upsert ignores them otherwise)
  await updateVoteResults(existingItems);

  if (newItems.length === 0) {
    console.log('✅ Nothing new. DB is up to date.');
    await finishScrapeRun(runId, { sources_attempted: SCRAPERS.length, items_found: totalFound, items_inserted: 0, errors: allErrors });
    return;
  }

  // 4. AI enrichment
  console.log(`\n🤖 Running AI enrichment on ${newItems.length} items...`);
  const { enriched, errors: enrichErrors } = await enrichBatch(newItems);
  allErrors.push(...enrichErrors.map(e => ({ source: 'AI enricher', ...e })));

  // 5. Save to Supabase
  console.log(`\n💾 Saving to Supabase...`);
  const { inserted, skipped } = await upsertItems(enriched);
  totalInserted = inserted;

  console.log(`✅ Done! Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);

  if (allErrors.length) {
    console.log(`\n⚠️  Errors (${allErrors.length}):`);
    allErrors.forEach(e => console.log(`  - ${e.source}: ${e.error}`));
  }

  await finishScrapeRun(runId, {
    sources_attempted: SCRAPERS.length,
    items_found: totalFound,
    items_inserted: totalInserted,
    errors: allErrors,
    finished_at: new Date().toISOString(),
  });

  console.log(`\n🏁 Run complete at ${new Date().toLocaleString()}\n`);
}

// --- Entry point ---
const runOnce = process.argv.includes('--once');

if (runOnce) {
  // Single run (for manual testing or CI)
  runScrape().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  // Scheduled mode
  const cronSchedule = process.env.SCRAPE_CRON || '0 */4 * * *'; // every 4 hours
  console.log(`⏰ Civic Scraper running on schedule: ${cronSchedule}`);
  console.log('   (Run with --once flag to execute immediately)\n');

  // Also run immediately on start
  runScrape().catch(console.error);

  cron.schedule(cronSchedule, () => {
    runScrape().catch(console.error);
  });
}
