-- Run this in your Supabase SQL editor to set up the database

-- Main civic items table
CREATE TABLE IF NOT EXISTS civic_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,           -- e.g. "Seattle City Council", "Burien City Clerk"
  title TEXT NOT NULL,
  summary TEXT,                        -- AI-generated 2-sentence summary
  body TEXT,                           -- raw scraped content
  category TEXT,                       -- 'vote', 'meeting', 'event', 'news', 'fundraiser', 'filing'
  city TEXT,                           -- 'seattle', 'burien', 'king_county', 'regional'
  tags TEXT[],                         -- ['housing', 'budget', 'transit', ...]
  politicians TEXT[],                  -- extracted names
  event_date TIMESTAMPTZ,              -- if it's a future event
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  importance_score INTEGER DEFAULT 5,  -- 1-10, AI-assigned
  UNIQUE(source_url)
);

-- Index for fast querying
CREATE INDEX IF NOT EXISTS idx_civic_items_city ON civic_items(city);
CREATE INDEX IF NOT EXISTS idx_civic_items_category ON civic_items(category);
CREATE INDEX IF NOT EXISTS idx_civic_items_scraped_at ON civic_items(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_items_event_date ON civic_items(event_date);

-- Scrape run log (for debugging/monitoring)
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  sources_attempted INTEGER DEFAULT 0,
  items_found INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'
);

-- Enable Row Level Security (optional but good practice)
ALTER TABLE civic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (used by scraper)
CREATE POLICY "Service role full access" ON civic_items
  FOR ALL USING (true);
CREATE POLICY "Service role full access" ON scrape_runs
  FOR ALL USING (true);
