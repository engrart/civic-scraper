// app/index.tsx  — Feed screen
import React, { useState, useCallback } from 'react';
import {
  FlatList, View, Text, ActivityIndicator, StyleSheet,
  useColorScheme, RefreshControl,
} from 'react-native';
import PurpleHeader from '../components/PurpleHeader';
import CivicCard from '../components/CivicCard';
import { useCivicItems } from '../hooks/useCivicItems';
import { Colors } from '../lib/theme';
import { CivicItem } from '../lib/supabase';

const CHIPS = [
  { label: 'All',      value: 'all' },
  { label: 'Seattle',  value: 'seattle' },
  { label: 'Burien',   value: 'burien' },
  { label: 'Votes',    value: 'vote' },
  { label: 'Meetings', value: 'meeting' },
  { label: 'Finance',  value: 'filing' },
  { label: 'News',     value: 'news' },
];

const CITY_FILTERS   = ['seattle', 'burien'];
const CAT_FILTERS    = ['vote', 'meeting', 'filing', 'news', 'event', 'fundraiser'];

export default function FeedScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = dark ? Colors.dark : Colors.light;

  const [activeChip, setActiveChip] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const cityFilter = CITY_FILTERS.includes(activeChip) ? activeChip : undefined;
  const catFilter  = CAT_FILTERS.includes(activeChip)  ? activeChip : undefined;

  const { items, loading, error, refetch } = useCivicItems({
    city: cityFilter,
    category: catFilter,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: CivicItem }) => (
    <CivicCard item={item} onStarToggle={refetch} />
  ), [refetch]);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <PurpleHeader
        title="Local Politics"
        chips={CHIPS}
        activeChip={activeChip}
        onChipPress={setActiveChip}
      />

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple700} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: t.textSecondary, textAlign: 'center', padding: 24 }}>
            {"Couldn't load items.\nCheck your Supabase keys in lib/supabase.ts"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.purple700}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: t.textTertiary }}>No items yet. Run the scraper!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
