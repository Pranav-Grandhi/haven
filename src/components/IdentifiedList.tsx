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
      <Text style={styles.title}>Identified from camera</Text>
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
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  dangerPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
  },
  safeLabel: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dangerLabel: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  items: {
    color: '#fff',
    fontSize: 14,
  },
});
