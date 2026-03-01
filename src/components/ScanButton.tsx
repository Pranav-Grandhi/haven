import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useStore } from '../state/store';

type ScanButtonProps = {
  onScan: () => void | Promise<void>;
  disabled?: boolean;
};

export function ScanButton({ onScan, disabled = false }: ScanButtonProps) {
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
      style={[styles.button, is_active && styles.buttonActive, (disabled || !active) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={!active || disabled}
    >
      {is_active ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>Start scan</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonActive: {
    backgroundColor: '#ef4444',
    borderColor: 'rgba(248,113,113,0.5)',
    shadowColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
