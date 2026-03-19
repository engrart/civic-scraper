# 🏛️ Civic Scraper

Automatically scrapes Seattle and Burien local political activity — council meetings, votes, legislation, campaign finance, and local news — and stores it in Supabase with AI-generated summaries.

## What It Scrapes

| Source | Type | City |
|--------|------|------|
| Seattle Legistar API | Meetings, legislation | Seattle |
| Seattle Channel RSS | Council video/news | Seattle |
| Burien City Website | Agendas, meetings | Burien |
| B-Town Blog | Local news | Burien |
| WA PDC (open data API) | Campaign finance, candidate filings | Both |
| Seattle Times Politics | News | Seattle |
| The Stranger | News | Seattle |
| Crosscut | Policy/news | Seattle |
| PubliCola | Policy/news | Seattle |
| West Seattle Blog | Neighborhood news | Seattle |
| MyNorthwest | Local news | Seattle |

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd civic-scraper
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open the **SQL Editor** and run the contents of `supabase-schema.sql`
3. Copy your **Project URL** and **service_role** key from Settings → API

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your keys
```

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run it

```bash
# Run once (good for testing)
npm run scrape

# Run continuously on a cron schedule (default: every 4 hours)
npm start
```

## Supabase Schema

The `civic_items` table has:

| Column | Description |
|--------|-------------|
| `title` | Item headline |
| `summary` | AI-written 2-sentence summary |
| `category` | `meeting`, `vote`, `event`, `news`, `fundraiser`, `filing` |
| `city` | `seattle`, `burien`, `king_county`, `regional` |
| `tags` | Array of topic tags |
| `politicians` | Extracted politician names |
| `importance_score` | 1-10 AI-assigned score |
| `event_date` | Future date if it's an upcoming event |
| `is_read` | For your app to track read state |
| `is_starred` | For saving favorites |

## Deployment

### Option A: Supabase Edge Functions (free, serverless)
Deploy as an Edge Function and use Supabase's built-in cron to trigger it.

### Option B: Railway (recommended for always-on)
```bash
# Install Railway CLI, then:
railway init
railway up
```
Set your environment variables in the Railway dashboard.
Railway's free tier handles this easily since the scraper mostly sleeps.

### Option C: Render
Similar to Railway — connect your repo and set env vars.

## Building the iPhone App

The Supabase table is your API. From React Native / Expo:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get latest items
const { data } = await supabase
  .from('civic_items')
  .select('*')
  .order('scraped_at', { ascending: false })
  .limit(50);

// Filter by city
const { data } = await supabase
  .from('civic_items')
  .select('*')
  .eq('city', 'burien')
  .order('scraped_at', { ascending: false });

// Upcoming events only
const { data } = await supabase
  .from('civic_items')
  .select('*')
  .gte('event_date', new Date().toISOString())
  .order('event_date', { ascending: true });
```

## Adding More Sources

Add a new file to `src/scrapers/` that exports a `scrapeAll()` function returning an array of items matching the schema, then import it in `src/index.js`.
