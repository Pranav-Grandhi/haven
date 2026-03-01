import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES, MODE_DANGERS, MODE_SAFE_COVER } from '../constants/disasterModes';
import { THEME } from '../constants/colors';
import type { DisasterMode } from '../types';

/**
 * For the selected disaster mode: what might fall/shake or be dangerous (🔴)
 * and what is safe cover / where to go (🟢). Same idea for flood, tornado, etc.
 */
export function ModeGuide() {
  const active = useStore((s) => s.active);
  const [expanded, setExpanded] = useState(false);

  if (!active) return null;

  const modeLabel = DISASTER_MODES[active].label;
  const dangers = MODE_DANGERS[active as DisasterMode];
  const safeCover = MODE_SAFE_COVER[active as DisasterMode];

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} guide for ${modeLabel}`}
      >
        <Text style={styles.headerTitle}>
          What to expect — {modeLabel}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Avoid</Text>
            {dangers.map((line, i) => (
              <Text key={i} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.safeTitle]}>Safe cover</Text>
            {safeCover.map((line, i) => (
              <Text key={i} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.6,
  },
  dangerTitle: {
    color: THEME.danger,
  },
  safeTitle: {
    color: THEME.safe,
  },
  bullet: {
    color: THEME.text,
    fontSize: 13,
    lineHeight: 21,
    marginLeft: 4,
  },
});
