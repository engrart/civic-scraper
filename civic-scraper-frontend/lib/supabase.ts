// src/lib/supabase.ts
// Replace these with your actual Supabase project URL and anon key.
// Find them in: Supabase Dashboard → Settings → API
//
// IMPORTANT: Use the ANON key here (not the service key).
// The anon key is safe to use in a mobile app.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://segviuyrpzschupuxotr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2356BY5MujQOOrLBEZrr6A_FBR296ZZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type CivicItem = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: 'meeting' | 'vote' | 'event' | 'news' | 'fundraiser' | 'filing' | 'other';
  city: 'seattle' | 'burien' | 'king_county' | 'regional' | 'other';
  tags: string[];
  politicians: string[];
  source_name: string;
  source_url: string;
  event_date: string | null;
  published_at: string | null;
  scraped_at: string;
  is_read: boolean;
  is_starred: boolean;
  importance_score: number;
};
