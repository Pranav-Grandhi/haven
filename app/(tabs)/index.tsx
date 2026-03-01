import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { HUD } from '@/src/components/HUD';
import { OverlayCanvas } from '@/src/components/OverlayCanvas';
import { IdentifiedList } from '@/src/components/IdentifiedList';
import { DetailCard } from '@/src/components/DetailCard';
import { ControlBar } from '@/src/components/ControlBar';
import { CameraPlaceholder, type CameraCaptureRef } from '@/src/components/CameraPlaceholder';
import { useAnalysis } from '@/src/hooks/useAnalysis';
import { useZoneTracking } from '@/src/hooks/useZoneTracking';
import { useStore } from '@/src/state/store';
import { useSpeechSynthesis } from '@/src/hooks/useSpeechSynthesis';

export default function ShelterScanScreen() {
  const { width, height } = useWindowDimensions();
  const feedHeight = height * 0.55;
  const cameraRef = useRef<CameraCaptureRef>(null);
  const { analyzeFrame } = useAnalysis();
  const { speak } = useSpeechSynthesis();
  const startScan = useStore((s) => s.startScan);
  const stopScan = useStore((s) => s.stopScan);
  const setCurrentFrame = useStore((s) => s.setCurrentFrame);
  const clearAnalysis = useStore((s) => s.clearAnalysis);
  const active = useStore((s) => s.active);
  const { identifiedSummary } = useZoneTracking();

  const handleScan = useCallback(async () => {
    if (!active) return;
    clearAnalysis(); // So overlay shows only this scan’s result, not previous area
    startScan();
    try {
      const photo = await cameraRef.current?.takePictureAsync?.();
      if (photo?.uri) {
        const analysis = await analyzeFrame({
          frame_id: `frame_${Date.now()}`,
          image_data: '',
          image_uri: photo.uri,
          image_width: photo.width,
          image_height: photo.height,
          timestamp: Date.now() / 1000,
          metadata: { camera_motion: 'stable', blur_score: null, sequence_index: 0 },
        });
        if (analysis?.voice_response) speak(analysis.voice_response);
      } else {
        const analysis = await analyzeFrame({
          frame_id: `frame_${Date.now()}`,
          image_data: '',
          timestamp: Date.now() / 1000,
          metadata: { camera_motion: 'stable', blur_score: 0.1, sequence_index: 0 },
        });
        if (analysis?.voice_response) speak(analysis.voice_response);
      }
    } catch (e) {
      speak('Analysis failed. Please try again.');
    } finally {
      stopScan();
      setCurrentFrame(null);
    }
  }, [active, clearAnalysis, startScan, stopScan, setCurrentFrame, analyzeFrame, speak]);

  return (
    <View style={styles.container}>
      <HUD />
      <View style={[styles.feed, { height: feedHeight }]}>
        <CameraPlaceholder ref={cameraRef} />
        <OverlayCanvas layoutWidth={width} layoutHeight={feedHeight} />
      </View>
      <IdentifiedList safe={identifiedSummary.safe} danger={identifiedSummary.danger} />
      <View style={styles.controls}>
        <ControlBar onScan={handleScan} />
      </View>
      <DetailCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  feed: {
    width: '100%',
    overflow: 'hidden',
  },
  controls: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
