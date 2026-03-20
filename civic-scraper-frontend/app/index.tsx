// app/index.tsx  — Feed screen
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  FlatList, View, Text, ActivityIndicator, StyleSheet,
  useColorScheme, RefreshControl, PanResponder, Animated, useWindowDimensions,
} from 'react-native';
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
const PAGE_GAP     = 16; // visible gap between pages during swipe

function getFilterForChip(chipValue: string) {
  const city     = CITY_FILTERS.includes(chipValue) ? chipValue : undefined;
  const category = CAT_FILTERS.includes(chipValue)  ? chipValue : undefined;
  return { city, category };
}

function getAdjacentChipValue(chipValue: string, direction: 'left' | 'right') {
  const idx  = CHIPS.findIndex(c => c.value === chipValue);
  if (idx === -1) return null;
  const next = direction === 'left' ? idx + 1 : idx - 1;
  if (next < 0 || next >= CHIPS.length) return null;
  return CHIPS[next].value;
}

// ─── FeedPane ──────────────────────────────────────────────────────────────────
type FeedPaneProps = {
  items: CivicItem[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  renderItem: ({ item }: { item: CivicItem }) => React.ReactElement;
  textColor: string;
  errorColor: string;
};

function FeedPane({ items, loading, error, refreshing, onRefresh, renderItem, textColor, errorColor }: FeedPaneProps) {
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.purple700} size="large" />
      </View>
    );
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

// ─── FeedScreen ────────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const scheme = useColorScheme();
  const dark   = scheme === 'dark';
  const t      = dark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();

  // PAGE_WIDTH is the slot width for each pane in the 3-pane row (content + trailing gap).
  // Row layout: [prev: width, gap: PAGE_GAP, active: width, gap: PAGE_GAP, next: width]
  // Total row width = 3*width + 2*PAGE_GAP
  //
  // panX positions:
  //   -(width + PAGE_GAP)        → active pane is centered (default)
  //   0                          → prev pane is centered  (swiped right)
  //   -(2*(width + PAGE_GAP))    → next pane is centered  (swiped left)
  const PAGE_WIDTH = width + PAGE_GAP;

  // panX drives the entire 3-pane row. Created once and never recreated.
  const panX        = useRef(new Animated.Value(-PAGE_WIDTH)).current;
  const isAnimating = useRef(false);

  const [activeChip, setActiveChip] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Stable refs for values read inside the PanResponder (avoids stale closures
  // since the PanResponder is created once and never recreated).
  const activeChipRef = useRef(activeChip);
  const pageWidthRef  = useRef(PAGE_WIDTH);
  const widthRef      = useRef(width);
  useEffect(() => { activeChipRef.current = activeChip; },               [activeChip]);
  useEffect(() => { pageWidthRef.current = PAGE_WIDTH; widthRef.current = width; }, [PAGE_WIDTH, width]);

  // Adjacent chip values (null at boundaries)
  const prevChipValue = getAdjacentChipValue(activeChip, 'right');
  const nextChipValue = getAdjacentChipValue(activeChip, 'left');

  const activeFilter = useMemo(() => getFilterForChip(activeChip),                              [activeChip]);
  const prevFilter   = useMemo(() => prevChipValue ? getFilterForChip(prevChipValue) : {},       [prevChipValue]);
  const nextFilter   = useMemo(() => nextChipValue ? getFilterForChip(nextChipValue) : {},       [nextChipValue]);

  const { items, loading, error, refetch }                                           = useCivicItems(activeFilter);
  const { items: prevItems, loading: prevLoading, error: prevError }                 = useCivicItems(prevFilter, { enabled: !!prevChipValue });
  const { items: nextItems, loading: nextLoading, error: nextError }                 = useCivicItems(nextFilter, { enabled: !!nextChipValue });

  // Warm both neighbors whenever active chip changes
  useEffect(() => {
    if (prevChipValue) prefetchCivicItems(getFilterForChip(prevChipValue)).catch(() => {});
    if (nextChipValue) prefetchCivicItems(getFilterForChip(nextChipValue)).catch(() => {});
  }, [activeChip, prevChipValue, nextChipValue]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // PanResponder — created ONCE (useRef) so renders never recreate it.
  // All dynamic values are read from refs, not from the closure.
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      !isAnimating.current &&
      Math.abs(dx) > 10 &&
      Math.abs(dx) > Math.abs(dy) * 1.5,

    onPanResponderMove: (_, { dx }) => {
      const pw      = pageWidthRef.current;
      const chip    = activeChipRef.current;
      const hasNext = !!getAdjacentChipValue(chip, 'left');
      const hasPrev = !!getAdjacentChipValue(chip, 'right');

      // Heavy rubber-band resistance at edges; tracking 1:1 otherwise
      const atEdge   = (dx < 0 && !hasNext) || (dx > 0 && !hasPrev);
      const factor   = atEdge ? 0.12 : 1;
      panX.setValue(-pw + dx * factor);
    },

    onPanResponderRelease: (_, { dx, vx }) => {
      const pw        = pageWidthRef.current;
      const w         = widthRef.current;
      const chip      = activeChipRef.current;
      const threshold = w * 0.25; // 25% screen width or velocity threshold

      const toNext = (dx < -threshold || vx < -0.4) && !!getAdjacentChipValue(chip, 'left');
      const toPrev = (dx >  threshold || vx >  0.4) && !!getAdjacentChipValue(chip, 'right');

      if (toNext) {
        isAnimating.current = true;
        Animated.spring(panX, {
          toValue: -2 * pw,
          useNativeDriver: true,
          velocity: vx,
          tension: 220,
          friction: 36,
        }).start(({ finished }) => {
          if (finished) {
            isAnimating.current = false;
            // Reset position BEFORE state change so the new pane layout
            // and the correct panX land in the same native draw frame.
            panX.setValue(-pageWidthRef.current);
            setActiveChip(getAdjacentChipValue(chip, 'left')!);
          }
        });
      } else if (toPrev) {
        isAnimating.current = true;
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          velocity: vx,
          tension: 220,
          friction: 36,
        }).start(({ finished }) => {
          if (finished) {
            isAnimating.current = false;
            // Reset position BEFORE state change — same reasoning as toNext branch.
            panX.setValue(-pageWidthRef.current);
            setActiveChip(getAdjacentChipValue(chip, 'right')!);
          }
        });
      } else {
        // Not enough — spring back to center
        Animated.spring(panX, {
          toValue: -pw,
          useNativeDriver: true,
          velocity: vx,
          tension: 220,
          friction: 36,
        }).start(() => { isAnimating.current = false; });
      }
    },

    onPanResponderTerminate: () => {
      const pw = pageWidthRef.current;
      Animated.spring(panX, {
        toValue: -pw,
        useNativeDriver: true,
        tension: 220,
        friction: 36,
      }).start(() => { isAnimating.current = false; });
    },
  })).current;

  // Direct chip-tap: instant position reset (no swipe animation needed)
  const handleChipPress = useCallback((chip: string) => {
    setActiveChip(chip);
    panX.setValue(-PAGE_WIDTH);
  }, [panX, PAGE_WIDTH]);

  const renderItem = useCallback(({ item }: { item: CivicItem }) => (
    <CivicCard item={item} onStarToggle={refetch} />
  ), [refetch]);

  // The 3-pane row is absolutely positioned so its height fills feedStage without
  // constraining its width (which must be wider than the screen).
  const rowWidth = 3 * width + 2 * PAGE_GAP;

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <PurpleHeader
        title="Civic-Scraper"
        chips={CHIPS}
        activeChip={activeChip}
        onChipPress={handleChipPress}
      />

      <View style={styles.feedStage} {...panResponder.panHandlers}>
        <Animated.View style={[styles.panesRow, { width: rowWidth, transform: [{ translateX: panX }] }]}>

          {/* ── Prev pane ─────────────────────────────────── */}
          <View style={[styles.pane, { width, marginRight: PAGE_GAP }]}>
            {prevChipValue ? (
              <FeedPane
                items={prevItems}
                loading={prevLoading}
                error={prevError}
                refreshing={false}
                onRefresh={onRefresh}
                renderItem={renderItem}
                textColor={t.textTertiary}
                errorColor={t.textSecondary}
              />
            ) : null}
          </View>

          {/* ── Active pane ───────────────────────────────── */}
          <View style={[styles.pane, { width, marginRight: PAGE_GAP }]}>
            <FeedPane
              items={items}
              loading={loading}
              error={error}
              refreshing={refreshing}
              onRefresh={onRefresh}
              renderItem={renderItem}
              textColor={t.textTertiary}
              errorColor={t.textSecondary}
            />
          </View>

          {/* ── Next pane ─────────────────────────────────── */}
          <View style={[styles.pane, { width }]}>
            {nextChipValue ? (
              <FeedPane
                items={nextItems}
                loading={nextLoading}
                error={nextError}
                refreshing={false}
                onRefresh={onRefresh}
                renderItem={renderItem}
                textColor={t.textTertiary}
                errorColor={t.textSecondary}
              />
            ) : null}
          </View>

        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1 },
  feedStage: { flex: 1, overflow: 'hidden' },
  // Absolute fill so height is always defined (enables flex children to stretch),
  // while width is set inline (wider than the screen).
  panesRow: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    flexDirection: 'row',
  },
  pane:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  list:   { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 32 },
});
