import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import { DISASTER_MODES } from '../constants/disasterModes';

export function HUD() {
  const hud_visible = useStore((s) => s.hud_visible);
  const active = useStore((s) => s.active);
  const current = useStore((s) => s.current);
  const is_active = useStore((s) => s.is_active);
  const live_scan_enabled = useStore((s) => s.live_scan_enabled);

  if (!hud_visible) return null;

  const modeLabel = active ? DISASTER_MODES[active].label : 'Pick a scenario';
  const score = current?.safety_score?.overall ?? '—';
  const riskCount = current?.risks_summary?.total_count ?? 0;

  return (
    <View style={styles.bar}>
      <View style={styles.modeRow}>
        <View style={styles.modeDot} />
        <Text style={styles.mode}>{modeLabel.toUpperCase()}</Text>
      </View>
      <Text style={styles.score}>Safety: {score}/100</Text>
      <View style={styles.risksRow}>
        <View style={[styles.risksDot, riskCount > 0 && styles.risksDotWarning]} />
        <Text style={styles.risks}>{riskCount} risks</Text>
      </View>
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
    backgroundColor: 'rgba(15,15,26,0.94)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  mode: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  score: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  risksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  risksDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.8)',
  },
  risksDotWarning: {
    backgroundColor: '#f59e0b',
  },
  risks: {
    color: 'rgba(241,245,249,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  liveBadge: {
    backgroundColor: 'rgba(34,197,94,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scanning: {
    backgroundColor: 'rgba(59,130,246,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.4)',
  },
  scanningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
