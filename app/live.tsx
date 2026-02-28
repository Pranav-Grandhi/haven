import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CAPTURE_INTERVAL_MS = 400;
const CAPTURE_QUALITY = 0.35;
const MAX_BUFFERED_FRAMES = 8;

type CapturedFrame = {
  uri: string;
  timestamp: number;
};

export default function LiveCaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const captureBusyRef = useRef(false);
  const frameBufferRef = useRef<CapturedFrame[]>([]);
  const isFocused = useIsFocused();

  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || captureBusyRef.current) {
      return;
    }

    captureBusyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: CAPTURE_QUALITY,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.uri) {
        return;
      }

      const frame = { uri: photo.uri, timestamp: Date.now() };
      frameBufferRef.current = [frame, ...frameBufferRef.current].slice(0, MAX_BUFFERED_FRAMES);
    } catch {
      // Ignore transient capture errors to keep the loop running.
    } finally {
      captureBusyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (permission?.granted || !isFocused || !cameraReady) {
      return;
    }
    void requestPermission();
  }, [cameraReady, isFocused, permission?.granted, requestPermission]);

  useEffect(() => {
    if (!isFocused || !permission?.granted || !cameraReady) {
      return;
    }

    const intervalId = setInterval(() => {
      void captureFrame();
    }, CAPTURE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [cameraReady, captureFrame, isFocused, permission?.granted]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ED786" />
        <Text style={styles.loadingText}>Starting camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access required</Text>
        <Text style={styles.permissionDetail}>Allow camera to run live capture continuously.</Text>
        <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="picture"
        active={isFocused}
        onCameraReady={() => setCameraReady(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#05080C',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#D6DEE7',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#05080C',
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  permissionTitle: {
    color: '#F7FAFC',
    fontSize: 30,
    fontWeight: '900',
  },
  permissionDetail: {
    color: '#A8B6C5',
    fontSize: 16,
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 6,
    backgroundColor: '#1ED786',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#042210',
    fontSize: 18,
    fontWeight: '800',
  },
});
