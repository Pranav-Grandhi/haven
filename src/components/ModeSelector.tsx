import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES, ALL_MODES } from '../constants/disasterModes';
import type { DisasterMode } from '../types';

const MODE_ACCENT: Record<DisasterMode, string> = {
  earthquake: '#a78bfa',
  flood: '#38bdf8',
  tornado: '#fbbf24',
  blast: '#fb923c',
  fire: '#f87171',
  hazmat: '#4ade80',
};

export function ModeSelector() {
  const active = useStore((s) => s.active);
  const setMode = useStore((s) => s.setMode);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {ALL_MODES.map((mode) => {
        const config = DISASTER_MODES[mode];
        const isActive = active === mode;
        const accent = MODE_ACCENT[mode];
        return (
          <Pressable
            key={mode}
            style={[
              styles.pill,
              isActive && [styles.pillActive, { backgroundColor: `${accent}22`, borderColor: accent }],
            ]}
            onPress={() => setMode(mode)}
          >
            <View style={[styles.dot, isActive && { backgroundColor: accent }]} />
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {config.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillActive: {
    borderWidth: 1.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  pillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
