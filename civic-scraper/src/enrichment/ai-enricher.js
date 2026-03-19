/**
 * AI enrichment using Claude API
 * - Validates/corrects category
 * - Extracts politician names
 * - Assigns importance score
 * - Generates a clean 2-sentence summary
 * - Extracts relevant tags
 */
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a civic information assistant helping a Seattle-area resident stay informed about local politics.
You will receive raw scraped civic data and return a structured JSON enrichment.

Return ONLY valid JSON with this exact shape:
{
  "summary": "2-sentence plain-English summary of what this item is and why it matters",
  "category": "one of: meeting | vote | event | news | fundraiser | filing | other",
  "city": "one of: seattle | burien | king_county | regional | other",
  "tags": ["array", "of", "relevant", "topic", "tags"],
  "politicians": ["array of full names of politicians mentioned"],
  "importance_score": 7,
  "event_date": "ISO date string if this is a future event, or null"
}

importance_score rules (1-10):
- 8-10: Votes on major ordinances, elections, budget decisions, major policy changes
- 5-7: Council meetings, candidate filings, significant news
- 3-4: Routine agendas, minor news
- 1-2: Duplicate-seeming items, press releases with little substance

Be concise. The summary should be readable in under 10 seconds.`;

/**
 * Enrich a single civic item with AI.
 */
async function enrichItem(item) {
  const prompt = `Title: ${item.title}
Source: ${item.source_name}
Body: ${(item.body || '').slice(0, 800)}
Current category guess: ${item.category}
Current city guess: ${item.city}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();

  // Strip any accidental markdown fences
  const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  const enriched = JSON.parse(clean);

  return {
    ...item,
    summary: enriched.summary || item.body?.slice(0, 200),
    category: enriched.category || item.category,
    city: enriched.city || item.city,
    tags: enriched.tags?.length ? enriched.tags : (item.tags || []),
    politicians: enriched.politicians?.length ? enriched.politicians : (item.politicians || []),
    importance_score: enriched.importance_score ?? 5,
    event_date: enriched.event_date || item.event_date,
  };
}

/**
 * Enrich a batch of items, with rate limiting and error tolerance.
 * Processes in chunks to avoid hammering the API.
 */
export async function enrichBatch(items, { chunkSize = 5, delayMs = 200 } = {}) {
  const enriched = [];
  const errors = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    const results = await Promise.allSettled(chunk.map(item => enrichItem(item)));

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        enriched.push(r.value);
      } else {
        console.warn(`  AI enrichment failed for "${chunk[j].title}": ${r.reason?.message}`);
        errors.push({ title: chunk[j].title, error: r.reason?.message });
        enriched.push(chunk[j]); // use raw item as fallback
      }
    }

    // Small delay between chunks to be polite to the API
    if (i + chunkSize < items.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  console.log(`  AI enriched: ${enriched.length - errors.length}/${items.length} successfully`);
  return { enriched, errors };
}
