// app/index.tsx  — Feed screen
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  FlatList, View, Text, StyleSheet, Animated,
  useColorScheme, RefreshControl,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import PurpleHeader from '../components/PurpleHeader';
import CivicCard from '../components/CivicCard';
import { prefetchCivicItems, useCivicItems } from '../hooks/useCivicItems';
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

const CITY_FILTERS = ['seattle', 'burien'];
const CAT_FILTERS  = ['vote', 'meeting', 'filing', 'news', 'event', 'fundraiser'];
const PAGE_GAP     = 16;
const SKELETON_CARD_COUNT = 6;

function getFilterForChip(chipValue: string) {
  const city     = CITY_FILTERS.includes(chipValue) ? chipValue : undefined;
  const category = CAT_FILTERS.includes(chipValue)  ? chipValue : undefined;
  return { city, category };
}

type SkeletonCardProps = {
  shimmerTranslateX: Animated.AnimatedInterpolation<number>;
  colors: {
    card: string;
    border: string;
    block: string;
    shimmer: string;
  };
};

function SkeletonCard({ shimmerTranslateX, colors }: SkeletonCardProps) {
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.skeletonShimmer,
          { backgroundColor: colors.shimmer, transform: [{ translateX: shimmerTranslateX }] },
        ]}
      />

      <View style={styles.skeletonTopRow}>
        <View style={[styles.skeletonBlock, styles.skeletonPillShort, { backgroundColor: colors.block }]} />
        <View style={[styles.skeletonBlock, styles.skeletonPillTiny, { backgroundColor: colors.block }]} />
      </View>

      <View style={[styles.skeletonBlock, styles.skeletonTitle, { backgroundColor: colors.block }]} />
      <View style={[styles.skeletonBlock, styles.skeletonBodyLineOne, { backgroundColor: colors.block }]} />
      <View style={[styles.skeletonBlock, styles.skeletonBodyLineTwo, { backgroundColor: colors.block }]} />

      <View style={styles.skeletonBottomRow}>
        <View style={[styles.skeletonBlock, styles.skeletonMeta, { backgroundColor: colors.block }]} />
        <View style={[styles.skeletonBlock, styles.skeletonMetaShort, { backgroundColor: colors.block }]} />
      </View>
    </View>
  );
}

function SkeletonFeed({ dark }: { dark: boolean }) {
  const shimmerProgress = useRef(new Animated.Value(0)).current;
  const placeholders = useMemo(
    () => Array.from({ length: SKELETON_CARD_COUNT }, (_, idx) => `skeleton-${idx}`),
    []
  );

  const skeletonColors = useMemo(
    () => dark
      ? {
          card: '#1D2430',
          border: 'rgba(255,255,255,0.08)',
          block: '#2A3341',
          shimmer: 'rgba(255,255,255,0.12)',
        }
      : {
          card: '#ECEFF3',
          border: 'rgba(17,24,39,0.08)',
          block: '#D7DDE5',
          shimmer: 'rgba(255,255,255,0.52)',
        },
    [dark]
  );

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerProgress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );

    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [shimmerProgress]);

  const shimmerTranslateX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 360],
  });

  return (
    <FlatList
      data={placeholders}
      keyExtractor={item => item}
      renderItem={() => <SkeletonCard shimmerTranslateX={shimmerTranslateX} colors={skeletonColors} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ─── FeedPane ──────────────────────────────────────────────────────────────────
type FeedPaneProps = {
  items: CivicItem[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  renderItem: ({ item }: { item: CivicItem }) => React.ReactElement;
  textColor: string;
  errorColor: string;
  dark: boolean;
};

function FeedPane({ items, loading, hasFetched, error, refreshing, onRefresh, renderItem, textColor, errorColor, dark }: FeedPaneProps) {
  if ((!hasFetched || loading) && !refreshing) {
    return <SkeletonFeed dark={dark} />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: errorColor, textAlign: 'center', padding: 24 }}>
          {"Couldn't load items.\nCheck your Supabase keys in lib/supabase.ts"}
        </Text>
      </View>
    );
  }
  return (
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
          <Text style={{ color: textColor }}>No items yet. Run the scraper!</Text>
        </View>
      }
    />
  );
}

type FeedPageProps = {
  chipValue: string;
  isActive: boolean;
  onRefresh: () => Promise<void>;
  renderItem: ({ item }: { item: CivicItem }) => React.ReactElement;
  textColor: string;
  errorColor: string;
  dark: boolean;
};

function FeedPage({ chipValue, isActive, onRefresh, renderItem, textColor, errorColor, dark }: FeedPageProps) {
  const filter = useMemo(() => getFilterForChip(chipValue), [chipValue]);
  const { items, loading, error, hasFetched, refetch } = useCivicItems(filter, { enabled: isActive });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isActive) {
      prefetchCivicItems(filter).catch(() => {});
    }
  }, [filter, isActive]);

  const onPageRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh, refetch]);

  return (
    <View style={styles.pageWrap}>
      <FeedPane
        items={items}
        loading={loading}
        hasFetched={hasFetched}
        error={error}
        refreshing={refreshing}
        onRefresh={onPageRefresh}
        renderItem={renderItem}
        textColor={textColor}
        errorColor={errorColor}
        dark={dark}
      />
    </View>
  );
}

// ─── FeedScreen ────────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const scheme = useColorScheme();
  const dark   = scheme === 'dark';
  const t      = dark ? Colors.dark : Colors.light;
  const [activeChip, setActiveChip] = useState('all');
  const pagerRef = useRef<PagerView>(null);

  const activeIndex = useMemo(
    () => Math.max(CHIPS.findIndex(chip => chip.value === activeChip), 0),
    [activeChip]
  );

  const prefetchNeighbors = useCallback((index: number) => {
    const prevChip = CHIPS[index - 1];
    const nextChip = CHIPS[index + 1];

    if (prevChip) {
      prefetchCivicItems(getFilterForChip(prevChip.value)).catch(() => {});
    }
    if (nextChip) {
      prefetchCivicItems(getFilterForChip(nextChip.value)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    prefetchNeighbors(activeIndex);
  }, [activeIndex, prefetchNeighbors]);

  const handleChipPress = useCallback((chip: string) => {
    const idx = CHIPS.findIndex(c => c.value === chip);
    if (idx === -1) return;
    setActiveChip(chip);
    pagerRef.current?.setPage(idx);
  }, []);

  const onPageSelected = useCallback((event: { nativeEvent: { position: number } }) => {
    const idx = event.nativeEvent.position;
    const chip = CHIPS[idx]?.value;
    if (!chip) return;
    setActiveChip(chip);
  }, []);

  const onRefresh = useCallback(async () => {
    const chip = CHIPS[activeIndex];
    if (!chip) return;
    await prefetchCivicItems(getFilterForChip(chip.value));
  }, [activeIndex]);

  const renderItem = useCallback(({ item }: { item: CivicItem }) => (
    <CivicCard item={item} onStarToggle={onRefresh} />
  ), [onRefresh]);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <PurpleHeader
        title="Civic-Scraper"
        chips={CHIPS}
        activeChip={activeChip}
        onChipPress={handleChipPress}
      />

      <PagerView
        ref={pagerRef}
        style={styles.feedStage}
        initialPage={activeIndex}
        pageMargin={PAGE_GAP}
        overdrag
        offscreenPageLimit={2}
        onPageSelected={onPageSelected}
      >
        {CHIPS.map(chip => (
          <View key={chip.value}>
            <FeedPage
              chipValue={chip.value}
              isActive={chip.value === activeChip}
              onRefresh={onRefresh}
              renderItem={renderItem}
              textColor={t.textTertiary}
              errorColor={t.textSecondary}
              dark={dark}
            />
          </View>
        ))}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1 },
  feedStage: { flex: 1 },
  pageWrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  list:   { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 32 },
  skeletonCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '44%',
  },
  skeletonTopRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  skeletonBottomRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  skeletonBlock: {
    borderRadius: 8,
  },
  skeletonPillShort: {
    width: 66,
    height: 22,
    borderRadius: 12,
  },
  skeletonPillTiny: {
    width: 54,
    height: 22,
    borderRadius: 12,
  },
  skeletonTitle: {
    width: '82%',
    height: 22,
    marginBottom: 10,
  },
  skeletonBodyLineOne: {
    width: '100%',
    height: 14,
    marginBottom: 8,
  },
  skeletonBodyLineTwo: {
    width: '74%',
    height: 14,
  },
  skeletonMeta: {
    width: 130,
    height: 14,
  },
  skeletonMetaShort: {
    width: 92,
    height: 14,
  },
});
