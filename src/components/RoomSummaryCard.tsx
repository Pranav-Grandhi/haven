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
      <Text style={styles.title}>Your safety summary</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🟢 Safest spot</Text>
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
    backgroundColor: 'rgba(26,26,46,0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: 220,
    paddingBottom: 12,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: 'rgba(241,245,249,0.9)',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerTitle: {
    color: '#f87171',
  },
  bodyText: {
    color: 'rgba(226,232,240,0.92)',
    fontSize: 13,
    lineHeight: 20,
  },
  bullet: {
    color: 'rgba(226,232,240,0.88)',
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 4,
  },
});
