// src/components/CivicCard.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useColorScheme, Linking,
} from 'react-native';
import { toggleStar, markRead } from '../hooks/useCivicItems';
import { CivicItem } from '../lib/supabase';
import { Colors } from '../lib/theme';

type Props = {
  item: CivicItem;
  onStarToggle?: () => void;
};

function getVoteStatusLabel(status: CivicItem['vote_result']) {
  if (status === 'passed') return 'Passed';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending';
  return null;
}

function getVoteStatusColors(status: CivicItem['vote_result'], dark: boolean) {
  if (status === 'passed') {
    return { bg: dark ? '#173422' : '#E6F6EA', text: dark ? '#8FE3AB' : '#23663A' };
  }

  if (status === 'failed') {
    return { bg: dark ? '#3D1E20' : '#FCEBEB', text: dark ? '#F0A7AD' : '#A32D2D' };
  }

  return { bg: dark ? '#3B3320' : '#FAEEDA', text: dark ? '#F2CF85' : '#854F0B' };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CivicCard({ item, onStarToggle }: Props) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = dark ? Colors.dark : Colors.light;
  const catColor = Colors.category[item.category] ?? Colors.category.other;
  const voteStatusLabel = item.category === 'vote' ? getVoteStatusLabel(item.vote_result) : null;
  const voteStatusColors = voteStatusLabel ? getVoteStatusColors(item.vote_result, dark) : null;

  async function handleStar() {
    await toggleStar(item.id, item.is_starred);
    onStarToggle?.();
  }

  async function handleLink() {
    await markRead(item.id);
    if (item.source_url) Linking.openURL(item.source_url);
  }

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      {/* Top row: unread dot, category badge, city, importance */}
      <View style={styles.topRow}>
        {!item.is_read && <View style={styles.unreadDot} />}
        <View style={[styles.badge, { backgroundColor: catColor.bg }]}>
          <Text style={[styles.badgeText, { color: catColor.text }]}>
            {item.category.toUpperCase()}
          </Text>
        </View>
        {voteStatusLabel && voteStatusColors ? (
          <View style={[styles.statusPill, { backgroundColor: voteStatusColors.bg }]}>
            <Text style={[styles.statusText, { color: voteStatusColors.text }]}>
              {voteStatusLabel}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.cityTag, { color: t.textTertiary }]}>{item.city}</Text>
        <View style={styles.dots}>
          {[1, 2, 3].map(n => (
            <View
              key={n}
              style={[
                styles.dot,
                { backgroundColor: item.importance_score >= n * 3
                    ? Colors.purple700
                    : t.cardBorder },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: t.text }]}>{item.title}</Text>

      {/* Summary — the hero content */}
      {item.summary ? (
        <Text style={[styles.summary, { color: t.textSecondary }]}>{item.summary}</Text>
      ) : (
        <Text style={[styles.summary, { color: t.textTertiary, fontStyle: 'italic' }]}>
          No summary available
        </Text>
      )}

      {/* Footer: source + actions */}
      <View style={styles.footer}>
        <Text style={[styles.meta, { color: t.textTertiary }]}>
          {item.source_name} · {timeAgo(item.scraped_at)}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleStar} style={styles.starBtn}>
            <Text style={[styles.star, { color: item.is_starred ? '#BA7517' : t.textTertiary }]}>
              {item.is_starred ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLink} style={styles.linkBtn}>
            <Text style={styles.linkText}>Full story ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.purple700,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10, fontWeight: '600', letterSpacing: 0.5,
  },
  cityTag: {
    fontSize: 11, marginLeft: 'auto',
  },
  dots: {
    flexDirection: 'row', gap: 2, alignItems: 'center',
  },
  dot: {
    width: 5, height: 5, borderRadius: 3,
  },
  title: {
    fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 6,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summary: {
    fontSize: 13, lineHeight: 19, marginBottom: 10,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  meta: {
    fontSize: 11, flex: 1,
  },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  starBtn: { padding: 4 },
  star: { fontSize: 18 },
  linkBtn: { padding: 4 },
  linkText: {
    fontSize: 12, fontWeight: '500', color: Colors.purple700,
  },
});
