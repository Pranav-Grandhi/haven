import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useStore } from '../state/store';

/**
 * After scanning the room: shows safest spot, what to do, what to avoid.
 */
export function RoomSummaryCard() {
  const room_summary = useStore((s) => s.room_summary);

  if (!room_summary) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room summary</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🟢 Safest</Text>
          <Text style={styles.bodyText}>{room_summary.safest}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✓ What to do</Text>
          {room_summary.whatToDo.map((line, i) => (
            <Text key={i} style={styles.bullet}>• {line}</Text>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>✗ What to avoid</Text>
          {room_summary.whatToAvoid.map((line, i) => (
            <Text key={i} style={styles.bullet}>• {line}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    maxHeight: 220,
    paddingBottom: 12,
  },
  title: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scroll: {
    paddingHorizontal: 14,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dangerTitle: {
    color: 'rgba(239, 68, 68, 0.95)',
  },
  bodyText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 20,
  },
  bullet: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 4,
  },
});
