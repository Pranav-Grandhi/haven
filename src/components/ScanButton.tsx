import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useStore } from '../state/store';
import { THEME } from '../constants/colors';

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
        <Text style={styles.label}>Scan room</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: THEME.safe,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: THEME.radiusCard,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonActive: {
    backgroundColor: THEME.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
