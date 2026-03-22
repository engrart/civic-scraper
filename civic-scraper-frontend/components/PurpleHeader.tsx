// src/components/PurpleHeader.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../lib/theme';

type FilterChip = { label: string; value: string };

type Props = {
  title: string;
  chips?: FilterChip[];
  activeChip?: string;
  onChipPress?: (value: string) => void;
};

export default function PurpleHeader({ title, chips, activeChip, onChipPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.titleRow}>
        <Image
          source={require('../assets/images/civic-mark.png')}
          style={styles.titleIcon}
          resizeMode="contain"
        />
        <Text style={styles.title}>{title}</Text>
      </View>
      {chips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          nestedScrollEnabled
          alwaysBounceVertical={false}
          contentInsetAdjustmentBehavior="never"
          style={styles.chipScroller}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map(chip => {
            const active = chip.value === activeChip;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => onChipPress?.(chip.value)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.purple700,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  titleIcon: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: '500',
    color: Colors.purple50,
  },
  chipScroller: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: Colors.purple50,
    borderColor: Colors.purple50,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.purple100,
  },
  chipTextActive: {
    color: Colors.purple800,
  },
});
