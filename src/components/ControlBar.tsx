import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ModeSelector } from './ModeSelector';
import { ScanButton } from './ScanButton';
import { useStore } from '../state/store';
import type { ScanPhase } from '../state/slices/analysisSlice';

type ControlBarProps = {
  onScan: () => void | Promise<void>;
  onSummarizeRoom: () => void;
  scanPhase?: ScanPhase;
};

export function ControlBar({ onScan, onSummarizeRoom, scanPhase = 'idle' }: ControlBarProps) {
  const current = useStore((s) => s.current);
  const history = useStore((s) => s.history);
  const hasData = !!(current || history.length > 0);
  const isBusy = scanPhase === 'capturing' || scanPhase === 'processing';
  const isResult = scanPhase === 'result';

  return (
    <View style={styles.bar}>
      {/* Row 1 — scrollable mode pills */}
      <View style={styles.modeRow}>
        <ModeSelector />
      </View>

      {/* Row 2 — action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.summaryButton, (!hasData || isResult) && styles.summaryButtonDisabled]}
          onPress={onSummarizeRoom}
          disabled={!hasData || isResult}
        >
          <Text style={styles.summaryLabel}>🔊  Hear summary</Text>
        </Pressable>

        {isResult ? (
          <Pressable style={styles.scanAgainButton} onPress={onScan}>
            <Text style={styles.scanAgainLabel}>↩  Scan again</Text>
          </Pressable>
        ) : (
          <ScanButton onScan={onScan} disabled={isBusy} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(13,13,22,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingBottom: 8,
  },

  // ── Row 1: mode pills ─────────────────────────────────────────────────────
  modeRow: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },

  // ── Row 2: action buttons ─────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  summaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  summaryButtonDisabled: {
    opacity: 0.4,
  },
  summaryLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  scanAgainButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.45)',
    alignItems: 'center',
  },
  scanAgainLabel: {
    color: '#e0f2fe',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
