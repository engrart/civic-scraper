// app/starred.tsx — Starred items screen
import React, { useCallback } from 'react';
import {
  FlatList, View, Text, ActivityIndicator, StyleSheet,
  useColorScheme,
} from 'react-native';
import PurpleHeader from '../components/PurpleHeader';
import CivicCard from '../components/CivicCard';
import { useStarredItems } from '../hooks/useCivicItems';
import { Colors } from '../lib/theme';
import { CivicItem } from '../lib/supabase';

export default function StarredScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = dark ? Colors.dark : Colors.light;

  const { items, loading, refetch } = useStarredItems();

  const renderItem = useCallback(({ item }: { item: CivicItem }) => (
    <CivicCard item={item} onStarToggle={refetch} />
  ), [refetch]);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <PurpleHeader title="Starred" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple700} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>☆</Text>
          <Text style={[styles.emptyText, { color: t.textTertiary }]}>
            Star items in the feed to save them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 32, color: '#ADADAD' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
