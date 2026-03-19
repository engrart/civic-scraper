// src/hooks/useCivicItems.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase, CivicItem } from '../lib/supabase';

type Filter = {
  city?: string;
  category?: string;
};

export function useCivicItems(filter: Filter = {}) {
  const [items, setItems] = useState<CivicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('civic_items')
      .select('*')
      .order('scraped_at', { ascending: false })
      .limit(60);

    if (filter.city) query = query.eq('city', filter.city);
    if (filter.category) query = query.eq('category', filter.category);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setItems(data as CivicItem[]);
    }
    setLoading(false);
  }, [filter.city, filter.category]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, error, refetch: fetch };
}

export function useUpcomingEvents() {
  const [events, setEvents] = useState<CivicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('civic_items')
        .select('*')
        .not('event_date', 'is', null)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(30);

      setEvents((data as CivicItem[]) ?? []);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  return { events, loading };
}

export function useStarredItems() {
  const [items, setItems] = useState<CivicItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('civic_items')
      .select('*')
      .eq('is_starred', true)
      .order('scraped_at', { ascending: false });
    setItems((data as CivicItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
}

export async function toggleStar(id: string, current: boolean) {
  await supabase
    .from('civic_items')
    .update({ is_starred: !current })
    .eq('id', id);
}

export async function markRead(id: string) {
  await supabase
    .from('civic_items')
    .update({ is_read: true })
    .eq('id', id);
}
