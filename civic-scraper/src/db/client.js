import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Insert a batch of civic items, ignoring duplicates (by source_url).
 * Returns { inserted, skipped }
 */
export async function upsertItems(items) {
  if (!items.length) return { inserted: 0, skipped: 0 };

  const { data, error } = await supabase
    .from('civic_items')
    .upsert(items, { onConflict: 'source_url', ignoreDuplicates: true })
    .select('id');

  if (error) throw new Error(`DB upsert error: ${error.message}`);

  const inserted = data?.length ?? 0;
  const skipped = items.length - inserted;
  return { inserted, skipped };
}

/**
 * Update vote_result for items that already exist in the DB (matched by source_url).
 */
export async function updateVoteResults(items) {
  const withResult = items.filter(i => i.vote_result && i.source_url);
  if (!withResult.length) return;

  await Promise.all(
    withResult.map(item =>
      supabase
        .from('civic_items')
        .update({ vote_result: item.vote_result })
        .eq('source_url', item.source_url)
    )
  );
}

/**
 * Check which URLs already exist in the DB (to skip re-scraping).
 */
export async function getExistingUrls(urls) {
  if (!urls.length) return new Set();

  const { data, error } = await supabase
    .from('civic_items')
    .select('source_url')
    .in('source_url', urls);

  if (error) throw new Error(`DB query error: ${error.message}`);
  return new Set(data.map(r => r.source_url));
}

/**
 * Log the start of a scrape run.
 */
export async function startScrapeRun() {
  const { data, error } = await supabase
    .from('scrape_runs')
    .insert({ started_at: new Date().toISOString() })
    .select('id')
    .single();
  if (error) console.warn('Could not log scrape run start:', error.message);
  return data?.id;
}

/**
 * Update scrape run log when finished.
 */
export async function finishScrapeRun(runId, stats) {
  if (!runId) return;
  await supabase
    .from('scrape_runs')
    .update({ finished_at: new Date().toISOString(), ...stats })
    .eq('id', runId);
}
