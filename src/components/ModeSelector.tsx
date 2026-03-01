import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES, MVP_MODES } from '../constants/disasterModes';
import type { DisasterMode } from '../types';

export function ModeSelector() {
  const active = useStore((s) => s.active);
  const setMode = useStore((s) => s.setMode);
  const modes = MVP_MODES; // Hackathon: 3 modes only

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {modes.map((mode) => {
        const config = DISASTER_MODES[mode];
        const isActive = active === mode;
        return (
          <Pressable
            key={mode}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => setMode(mode)}
          >
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
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
  },
  pillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
});
