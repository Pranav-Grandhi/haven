import type { CameraView as CameraViewType } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../state/store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type CameraCaptureRef = {
  takePictureAsync: (options?: { quality?: number; base64?: boolean }) => Promise<{
    uri: string;
    width: number;
    height: number;
    base64?: string;
  } | null>;
};

export const CameraPlaceholder = forwardRef<CameraCaptureRef>(function CameraPlaceholder(_, ref) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewType | null>(null);
  const requestedRef = useRef(false);
  const active = useStore((s) => s.active);
  const scan_context = useStore((s) => s.scan_context);
  const is_active = useStore((s) => s.is_active);

  // Request camera permission once on mount so we don't cause a refresh loop
  useEffect(() => {
    if (permission?.status !== 'undetermined' || requestedRef.current) return;
    requestedRef.current = true;
    const t = setTimeout(() => requestPermission(), 500);
    return () => clearTimeout(t);
  }, [permission?.status]);

  useImperativeHandle(ref, () => ({
    takePictureAsync: async (options?: { quality?: number; base64?: boolean }) => {
      if (!permission?.granted || !cameraRef.current) return null;
      try {
        const takePicture = (cameraRef.current as any).takePictureAsync ?? (cameraRef.current as any).takePicture;
        if (typeof takePicture !== 'function') return null;
        const photo = await takePicture.call(cameraRef.current, {
          quality: options?.quality ?? 0.8,
          base64: options?.base64 ?? true,
        });
        return photo
          ? {
              uri: photo.uri,
              width: photo.width,
              height: photo.height,
              base64: photo.base64 ?? undefined,
            }
          : null;
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
      <Text style={styles.placeholderTitle}>Haven</Text>
      <Text style={styles.placeholderSub}>
        {active
          ? `${scan_context === 'outdoor' ? 'Outdoor' : 'Indoor'} • ${active.replace(/_/g, ' ')} mode`
          : 'Pick a scenario below, then tap Start scan'}
      </Text>
      {isDenied ? (
        <Text style={styles.placeholderHint}>
          Camera access was denied. Open Settings → Haven → enable Camera, then reopen the app.
        </Text>
      ) : isWeb ? (
        <Text style={styles.placeholderHint} onPress={requestPermission}>
          Tap to allow camera (works on HTTPS or localhost)
        </Text>
      ) : (
        <>
          <Text style={styles.placeholderHint} onPress={requestPermission}>
            Tap to allow camera access
          </Text>
          <Text style={styles.simulatorHint}>
            On a simulator, use a real device to scan.
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  placeholderTitle: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  placeholderSub: {
    color: 'rgba(226,232,240,0.82)',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  placeholderHint: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  simulatorHint: {
    color: 'rgba(148,163,184,0.9)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  scanningBadge: {
    position: 'absolute',
    bottom: 16,
    color: 'rgba(241,245,249,0.95)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
