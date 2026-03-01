import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES, MODE_DANGERS, MODE_SAFE_COVER, MODE_DANGERS_OUTDOOR, MODE_SAFE_COVER_OUTDOOR } from '../constants/disasterModes';
import type { DisasterMode } from '../types';

/**
 * For the selected disaster mode: what might fall/shake or be dangerous (🔴)
 * and what is safe cover / where to go (🟢). Same idea for flood, tornado, etc.
 */
export function ModeGuide() {
  const active = useStore((s) => s.active);
  const scan_context = useStore((s) => s.scan_context);
  const [expanded, setExpanded] = useState(false);

  if (!active) return null;

  const modeLabel = DISASTER_MODES[active].label;
  const isOutdoor = scan_context === 'outdoor';
  const dangers = isOutdoor ? MODE_DANGERS_OUTDOOR[active as DisasterMode] : MODE_DANGERS[active as DisasterMode];
  const safeCover = isOutdoor ? MODE_SAFE_COVER_OUTDOOR[active as DisasterMode] : MODE_SAFE_COVER[active as DisasterMode];

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} guide for ${modeLabel}`}
      >
        <Text style={styles.headerTitle}>
          {isOutdoor ? 'Outdoor' : 'Indoor'} tips for {modeLabel}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isOutdoor ? '🔴 Avoid' : '🔴 May fall / avoid'}</Text>
            {dangers.map((line, i) => (
              <Text key={i} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.safeTitle]}>🟢 {isOutdoor ? 'Where to go' : 'Safe cover / where to go'}</Text>
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
    backgroundColor: 'rgba(26,26,46,0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(34,197,94,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chevron: {
    color: 'rgba(148,163,184,0.9)',
    fontSize: 12,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: 'rgba(241,245,249,0.9)',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  safeTitle: {
    color: 'rgba(52,211,153,0.98)',
  },
  bullet: {
    color: 'rgba(226,232,240,0.9)',
    fontSize: 13,
    lineHeight: 21,
    marginLeft: 4,
  },
});
