import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES, MODE_DANGERS, MODE_SAFE_COVER } from '../constants/disasterModes';
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
          What to expect in {modeLabel}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔴 May fall / avoid</Text>
            {dangers.map((line, i) => (
              <Text key={i} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.safeTitle]}>🟢 Safe cover / where to go</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 14,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  safeTitle: {
    color: 'rgba(34, 197, 94, 0.95)',
  },
  bullet: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 4,
  },
});
