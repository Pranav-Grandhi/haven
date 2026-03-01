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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 12,
  },
  newScanButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.8)',
  },
  newScanLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  summaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
