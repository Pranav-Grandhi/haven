import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface IdentifiedListProps {
  safe: string[];
  danger: string[];
}

/**
 * Shows objects identified from the camera as Safe vs Danger (scene-level or full-frame detections).
 */
export function IdentifiedList({ safe, danger }: IdentifiedListProps) {
  if (safe.length === 0 && danger.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spotted in your space</Text>
      <View style={styles.row}>
        {safe.length > 0 && (
          <View style={styles.pill}>
            <Text style={styles.safeLabel}>Safe</Text>
            <Text style={styles.items}>{safe.join(', ')}</Text>
          </View>
        )}
        {danger.length > 0 && (
          <View style={[styles.pill, styles.dangerPill]}>
            <Text style={styles.dangerLabel}>Danger</Text>
            <Text style={styles.items}>{danger.join(', ')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(15,15,26,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: 'rgba(241,245,249,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  dangerPill: {
    backgroundColor: 'rgba(239,68,68,0.16)',
    borderColor: 'rgba(248,113,113,0.5)',
  },
  safeLabel: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dangerLabel: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  items: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
});
