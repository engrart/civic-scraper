import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Fetch JSON and throw a useful error when status is non-2xx.
 */
export async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching JSON: ${url}`);
  }
  return res.json();
}

/**
 * Fetch HTML and return a Cheerio instance for parsing.
 */
export async function fetchHTML(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching HTML: ${url}`);
  }
  const html = await res.text();
  return cheerio.load(html);
}

/**
 * Normalize scraped text by collapsing whitespace.
 */
export function cleanText(value) {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

/**
 * Parse a date-ish value to ISO string; returns null when invalid.
 */
export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Wrap a scraper call to avoid failing the full scrape batch.
 */
export async function safeRun(name, fn) {
  try {
    const results = await fn();
    console.log(`  - ${name}: ${results.length} items`);
    return { name, results, error: null };
  } catch (err) {
    const error = err?.message || String(err);
    console.warn(`  - ${name}: failed (${error})`);
    return { name, results: [], error };
  }
}