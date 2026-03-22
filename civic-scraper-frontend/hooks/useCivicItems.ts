// src/hooks/useCivicItems.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase, CivicItem } from '../lib/supabase';

type Filter = {
  city?: string;
  category?: string;
};

type UseCivicItemsOptions = {
  enabled?: boolean;
};

const civicItemsCache = new Map<string, CivicItem[]>();
const inFlightRequests = new Map<string, Promise<CivicItem[]>>();

function getFilterKey(filter: Filter) {
  return `${filter.city ?? 'all'}::${filter.category ?? 'all'}`;
}

async function loadCivicItems(filter: Filter, { force = false } = {}) {
  const key = getFilterKey(filter);

  if (!force && civicItemsCache.has(key)) {
    return civicItemsCache.get(key) ?? [];
  }

  if (!force && inFlightRequests.has(key)) {
    return inFlightRequests.get(key) ?? Promise.resolve([]);
  }

  const request = (async () => {
    let query = supabase
      .from('civic_items')
      .select('*')
      .order('scraped_at', { ascending: false })
      .limit(60);

    if (filter.city) query = query.eq('city', filter.city);
    if (filter.category) query = query.eq('category', filter.category);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const items = (data as CivicItem[]) ?? [];
    civicItemsCache.set(key, items);
    return items;
  })();

  inFlightRequests.set(key, request);

  try {
    return await request;
  } finally {
    inFlightRequests.delete(key);
  }
}

export async function prefetchCivicItems(filter: Filter) {
  await loadCivicItems(filter);
}

export function useCivicItems(filter: Filter = {}, options: UseCivicItemsOptions = {}) {
  const enabled = options.enabled ?? true;
  const filterKey = getFilterKey(filter);
  const hasCachedEntry = civicItemsCache.has(filterKey);
  const cachedItems = civicItemsCache.get(filterKey) ?? [];

  const [items, setItems] = useState<CivicItem[]>(cachedItems);
  const [loading, setLoading] = useState(enabled && !hasCachedEntry);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(hasCachedEntry);

  const fetch = useCallback(async (force = false) => {
    if (!enabled) return;

    const cached = civicItemsCache.get(filterKey);
    if (cached && !force) {
      setItems(cached);
      setLoading(false);
      setHasFetched(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const nextItems = await loadCivicItems(filter, { force });
      setItems(nextItems);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, filter.city, filter.category, filterKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetch();
  }, [enabled, fetch]);

  return { items, loading, error, hasFetched, refetch: () => fetch(true) };
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
