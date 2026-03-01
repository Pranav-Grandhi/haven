import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES } from '../constants/disasterModes';
import { HUD_BACKGROUND } from '../constants/colors';

export function HUD() {
  const hud_visible = useStore((s) => s.hud_visible);
  const active = useStore((s) => s.active);
  const current = useStore((s) => s.current);
  const is_active = useStore((s) => s.is_active);
  const live_scan_enabled = useStore((s) => s.live_scan_enabled);

  if (!hud_visible) return null;

  const modeLabel = active ? DISASTER_MODES[active].label : 'No mode';
  const score = current?.safety_score?.overall ?? '—';
  const riskCount = current?.risks_summary?.total_count ?? 0;

  return (
    <View style={styles.bar}>
      <Text style={styles.mode}>🔴 {modeLabel.toUpperCase()}</Text>
      <Text style={styles.score}>Safety: {score}/100</Text>
      <Text style={styles.risks}>⚠️ {riskCount} risks</Text>
      {live_scan_enabled && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      {is_active && (
        <View style={styles.scanning}>
          <Text style={styles.scanningText}>Scanning...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: HUD_BACKGROUND,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  mode: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  score: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  risks: {
    color: '#fff',
    fontSize: 14,
  },
  liveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  scanning: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scanningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
