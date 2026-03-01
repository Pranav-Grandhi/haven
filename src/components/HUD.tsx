import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES } from '../constants/disasterModes';
import { THEME } from '../constants/colors';

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
      <Text style={styles.mode}>{modeLabel}</Text>
      <View style={styles.scoreWrap}>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.scoreLabel}>/100</Text>
      </View>
      <Text style={styles.risks}>{riskCount} risks</Text>
      {live_scan_enabled && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      {is_active && (
        <View style={styles.scanning}>
          <Text style={styles.scanningText}>Scanning…</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceBorder,
  },
  mode: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  scoreWrap: { flexDirection: 'row', alignItems: 'baseline' },
  score: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    color: THEME.textMuted,
    fontSize: 13,
    marginLeft: 2,
  },
  risks: {
    color: THEME.textMuted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  liveBadge: {
    backgroundColor: THEME.safe,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radiusPill,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scanning: {
    backgroundColor: THEME.exit,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radiusPill,
  },
  scanningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
