import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ModeSelector } from './ModeSelector';
import { ScanButton } from './ScanButton';
import { useStore } from '../state/store';
import { THEME } from '../constants/colors';
import type { ScanPhase } from '../state/slices/analysisSlice';

type ControlBarProps = {
  onScan: () => void | Promise<void>;
  onSummarizeRoom: () => void;
  scanPhase?: ScanPhase;
};

export function ControlBar({ onScan, onSummarizeRoom, scanPhase = 'idle' }: ControlBarProps) {
  const active = useStore((s) => s.active);
  const current = useStore((s) => s.current);
  const history = useStore((s) => s.history);
  const hasData = !!(current || history.length > 0);
  const isBusy = scanPhase === 'capturing' || scanPhase === 'processing';
  const isResult = scanPhase === 'result';

  return (
    <View style={styles.bar}>
      {isResult ? (
        <Pressable style={styles.newScanButton} onPress={onScan}>
          <Text style={styles.newScanLabel}>New scan</Text>
        </Pressable>
      ) : (
        <ScanButton onScan={onScan} disabled={isBusy} />
      )}
      {!isResult && (
        <Pressable
          style={[styles.summaryButton, !hasData && styles.summaryButtonDisabled]}
          onPress={onSummarizeRoom}
          disabled={!hasData}
        >
          <Text style={styles.summaryLabel}>Summarize</Text>
        </Pressable>
      )}
      <ModeSelector />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.surfaceBorder,
    gap: 12,
  },
  newScanButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: THEME.radiusCard,
    backgroundColor: THEME.exitBg,
    borderWidth: 1.5,
    borderColor: THEME.exit,
  },
  newScanLabel: {
    color: THEME.exit,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.safeBg,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  summaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: THEME.surface,
    borderColor: THEME.surfaceBorder,
  },
  summaryLabel: {
    color: THEME.safe,
    fontSize: 13,
    fontWeight: '700',
  },
});
