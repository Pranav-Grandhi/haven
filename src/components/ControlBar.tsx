import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ModeSelector } from './ModeSelector';
import { ScanButton } from './ScanButton';

type ControlBarProps = {
  onScan: () => Promise<void>;
};

export function ControlBar({ onScan }: ControlBarProps) {
  return (
    <View style={styles.bar}>
      <ScanButton onScan={onScan} />
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
});
