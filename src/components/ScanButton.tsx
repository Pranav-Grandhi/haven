import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useStore } from '../state/store';

type ScanButtonProps = {
  onScan: () => Promise<void>;
};

export function ScanButton({ onScan }: ScanButtonProps) {
  const is_active = useStore((s) => s.is_active);
  const stopScan = useStore((s) => s.stopScan);
  const active = useStore((s) => s.active);

  const handlePress = async () => {
    if (is_active) {
      stopScan();
      return;
    }
    await onScan();
  };

  return (
    <Pressable
      style={[styles.button, is_active && styles.buttonActive]}
      onPress={handlePress}
      disabled={!active}
    >
      {is_active ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>Scan</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
