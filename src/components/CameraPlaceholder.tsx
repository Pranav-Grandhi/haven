import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraView as CameraViewType } from 'expo-camera';
import { useStore } from '../state/store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type CameraCaptureRef = {
  takePictureAsync: () => Promise<{ uri: string; width: number; height: number } | null>;
};

export const CameraPlaceholder = forwardRef<CameraCaptureRef>(function CameraPlaceholder(_, ref) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewType | null>(null);
  const requestedRef = useRef(false);
  const active = useStore((s) => s.active);
  const is_active = useStore((s) => s.is_active);

  // Request camera permission once on mount so we don't cause a refresh loop
  useEffect(() => {
    if (permission?.status !== 'undetermined' || requestedRef.current) return;
    requestedRef.current = true;
    const t = setTimeout(() => requestPermission(), 500);
    return () => clearTimeout(t);
  }, [permission?.status]);

  useImperativeHandle(ref, () => ({
    takePictureAsync: async () => {
      if (!permission?.granted || !cameraRef.current) return null;
      try {
        const takePicture = (cameraRef.current as any).takePictureAsync ?? (cameraRef.current as any).takePicture;
        if (typeof takePicture !== 'function') return null;
        const photo = await takePicture.call(cameraRef.current, { quality: 0.8 });
        return photo ? { uri: photo.uri, width: photo.width, height: photo.height } : null;
      } catch {
        return null;
      }
    },
  }), [permission?.granted]);

  if (permission?.granted) {
    return (
      <View style={styles.container} collapsable={false}>
        <CameraView
          ref={cameraRef as any}
          style={StyleSheet.absoluteFill}
          onMountError={(e) => console.warn('Camera mount error:', e)}
        />
      </View>
    );
  }

  const isDenied = permission?.status === 'denied';
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, styles.placeholder]}>
      <Text style={styles.placeholderTitle}>ShelterScan</Text>
      <Text style={styles.placeholderSub}>
        {active ? `Mode: ${active}` : 'Select a disaster mode below'}
      </Text>
      {isDenied ? (
        <Text style={styles.placeholderHint}>
          Camera was denied. Enable it in device Settings for Haven, then reopen the app.
        </Text>
      ) : isWeb ? (
        <Text style={styles.placeholderHint} onPress={requestPermission}>
          Tap to allow camera (works on HTTPS or localhost)
        </Text>
      ) : (
        <>
          <Text style={styles.placeholderHint} onPress={requestPermission}>
            Tap to enable camera for scan
          </Text>
          <Text style={styles.simulatorHint}>
            On iOS Simulator, camera may not be available — use a real device for scanning.
          </Text>
        </>
      )}
      {is_active && <Text style={styles.scanningBadge}>Analyzing...</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: '#1a1a2e',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  placeholderSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 16,
  },
  placeholderHint: {
    color: '#3b82f6',
    fontSize: 14,
  },
  simulatorHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  scanningBadge: {
    position: 'absolute',
    bottom: 16,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
});
