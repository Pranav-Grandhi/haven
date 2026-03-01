import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { THEME } from '../constants/colors';

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
          <Text style={[styles.sectionTitle, styles.safeTitle]}>Safest</Text>
          <Text style={styles.bodyText}>{room_summary.safest}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to do</Text>
          {room_summary.whatToDo.map((line, i) => (
            <Text key={i} style={styles.bullet}>• {line}</Text>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>What to avoid</Text>
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
    backgroundColor: THEME.surface,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    maxHeight: 320,
    paddingBottom: 14,
  },
  title: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    letterSpacing: 0.2,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.6,
  },
  safeTitle: {
    color: THEME.safe,
  },
  dangerTitle: {
    color: THEME.danger,
  },
  bodyText: {
    color: THEME.text,
    fontSize: 13,
    lineHeight: 21,
  },
  bullet: {
    color: THEME.text,
    fontSize: 13,
    lineHeight: 21,
    marginLeft: 4,
  },
});
