import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES, ALL_MODES } from '../constants/disasterModes';
import type { DisasterMode } from '../types';

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
        return (
          <Pressable
            key={mode}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => setMode(mode as DisasterMode)}
          >
            <Text style={styles.pillEmoji}>{config.emoji}</Text>
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
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderColor: '#22c55e',
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillText: {
    color: 'rgba(241,245,249,0.75)',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#4ade80',
  },
});
