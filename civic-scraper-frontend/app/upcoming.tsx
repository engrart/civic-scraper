// app/upcoming.tsx — Upcoming events screen
import React from 'react';
import {
  SectionList, View, Text, ActivityIndicator, StyleSheet,
  TouchableOpacity, useColorScheme, Linking,
} from 'react-native';
import PurpleHeader from '../components/PurpleHeader';
import { useUpcomingEvents } from '../hooks/useCivicItems';
import { Colors } from '../lib/theme';
import { CivicItem } from '../lib/supabase';

function groupByWeek(events: CivicItem[]) {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  const thisWeek: CivicItem[] = [];
  const later: CivicItem[] = [];

  for (const e of events) {
    const d = new Date(e.event_date!);
    if (d <= weekFromNow) thisWeek.push(e);
    else later.push(e);
  }

  const sections = [];
  if (thisWeek.length) sections.push({ title: 'This week', data: thisWeek });
  if (later.length)    sections.push({ title: 'Coming up',  data: later });
  return sections;
}

function EventRow({ item }: { item: CivicItem }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = dark ? Colors.dark : Colors.light;

  const date = new Date(item.event_date!);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();

  return (
    <TouchableOpacity
      style={[styles.eventRow, { backgroundColor: t.card, borderColor: t.cardBorder }]}
      onPress={() => item.source_url && Linking.openURL(item.source_url)}
      activeOpacity={0.75}
    >
      <View style={styles.datePill}>
        <Text style={styles.month}>{month}</Text>
        <Text style={[styles.day, { color: t.text }]}>{day}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={[styles.eventTitle, { color: t.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.eventMeta, { color: t.textSecondary }]}>
          {item.source_name}
          {item.city ? ` · ${item.city}` : ''}
        </Text>
      </View>
      <Text style={{ color: Colors.purple700, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function UpcomingScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = dark ? Colors.dark : Colors.light;

  const { events, loading } = useUpcomingEvents();
  const sections = groupByWeek(events);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <PurpleHeader title="Upcoming" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.purple700} size="large" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: t.textTertiary }}>No upcoming events found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>
              {section.title.toUpperCase()}
            </Text>
          )}
          renderItem={({ item }) => <EventRow item={item} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    paddingVertical: 8, paddingHorizontal: 2,
  },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 0.5,
    padding: 14, marginBottom: 10,
  },
  datePill: { width: 42, alignItems: 'center' },
  month: { fontSize: 10, fontWeight: '600', color: Colors.purple700 },
  day:   { fontSize: 24, fontWeight: '500', lineHeight: 28 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 3 },
  eventMeta:  { fontSize: 12 },
});
