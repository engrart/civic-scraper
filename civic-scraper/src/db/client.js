import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Insert or update a batch of civic items by source_url.
 * Returns { saved }
 */
export async function upsertItems(items) {
  if (!items.length) return { saved: 0 };

  const { data, error } = await supabase
    .from('civic_items')
    .upsert(items, { onConflict: 'source_url' })
    .select('id');

  if (error) throw new Error(`DB upsert error: ${error.message}`);

  const saved = data?.length ?? 0;
  return { saved };
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
