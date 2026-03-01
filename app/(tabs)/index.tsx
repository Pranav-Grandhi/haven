import React, { useRef, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { HUD } from '@/src/components/HUD';
import { OverlayCanvas } from '@/src/components/OverlayCanvas';
import { IdentifiedList } from '@/src/components/IdentifiedList';
import { DetailCard } from '@/src/components/DetailCard';
import { ControlBar } from '@/src/components/ControlBar';
import { ModeGuide } from '@/src/components/ModeGuide';
import { RoomSummaryCard } from '@/src/components/RoomSummaryCard';
import { ResultPhotoView } from '@/src/components/ResultPhotoView';
import { CameraPlaceholder, type CameraCaptureRef } from '@/src/components/CameraPlaceholder';
import { useZoneTracking } from '@/src/hooks/useZoneTracking';
import { useStore } from '@/src/state/store';
import { useSpeechSynthesis } from '@/src/hooks/useSpeechSynthesis';
import { analyzeRoomWithLLM } from '@/src/services/llmAnalysis';
import { computeRoomSummary } from '@/src/utils/roomSummary';
import type { DisasterMode } from '@/src/types';
import type { ScanFrame } from '@/src/hooks/use360Scan';

/** Capture a frame every N milliseconds while scanning. */
const CAPTURE_INTERVAL_MS = 800;

export default function ShelterScanScreen() {
  const { width, height } = useWindowDimensions();
  const feedHeight = height * 0.55;
  const cameraRef = useRef<CameraCaptureRef>(null);
  const { speak } = useSpeechSynthesis();

  const clearAnalysis = useStore((s) => s.clearAnalysis);
  const active = useStore((s) => s.active);
  const scan_phase = useStore((s) => s.scan_phase);
  const setScanPhase = useStore((s) => s.setScanPhase);
  const setResultFromBurst = useStore((s) => s.setResultFromBurst);
  const setRoomSummary = useStore((s) => s.setRoomSummary);
  const current = useStore((s) => s.current);
  const history = useStore((s) => s.history);
  const { identifiedSummary } = useZoneTracking();

  const [frameCount, setFrameCount] = useState(0);
  /** Shown on screen when analysis fails so user sees why there's no result. */
  const [scanError, setScanError] = useState<string | null>(null);

  /** Accumulated frames during the free-form scan. */
  const framesRef = useRef<ScanFrame[]>([]);
  /** setInterval handle — kept in a ref so handleDone can clear it. */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanInProgress = useRef(false);

  // ── Start free-form scan ──────────────────────────────────────────────────
  const handleScanRoom = useCallback(async () => {
    if (!active || scanInProgress.current) return;
    scanInProgress.current = true;
    clearAnalysis();
    framesRef.current = [];
    setFrameCount(0);
    setScanPhase('capturing');

    let frameIndex = 0;
    intervalRef.current = setInterval(async () => {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8, base64: true });
      if (!photo) return;
      const frame: ScanFrame = {
        uri: photo.uri,
        frame_id: `frame_${frameIndex++}`,
        width: photo.width,
        height: photo.height,
        base64: photo.base64 ?? undefined,
      };
      framesRef.current = [...framesRef.current, frame];
      setFrameCount(framesRef.current.length);
    }, CAPTURE_INTERVAL_MS);
  }, [active, clearAnalysis, setScanPhase]);

  // ── User taps "Done" ──────────────────────────────────────────────────────
  const handleDoneScanning = useCallback(async () => {
    setScanError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const frames = framesRef.current;

    if (frames.length === 0) {
      speak('No photos captured. Please try again.');
      setScanPhase('idle');
      scanInProgress.current = false;
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
    const hasValidKey = apiKey.length > 0 && apiKey !== 'your-openai-key-here';
    if (!hasValidKey) {
      const msg = 'Add EXPO_PUBLIC_OPENAI_API_KEY to .env (get a key at platform.openai.com).';
      setScanError(msg);
      speak('Room analysis needs an API key. ' + msg);
      setScanPhase('idle');
      scanInProgress.current = false;
      return;
    }

    setScanPhase('processing');

    try {
      const result = await analyzeRoomWithLLM(frames, active as DisasterMode);

      if (!result.ok) {
        setScanError(result.error);
        speak('Analysis failed. Please try again.');
        setScanPhase('idle');
        scanInProgress.current = false;
        return;
      }

      const { analysis, resultPhotoUri } = result;
      const summary =
        computeRoomSummary(analysis, []) ?? {
          safest: analysis.actions?.[0]?.instruction ?? 'Move to the safest marked area.',
          whatToDo: (analysis.actions ?? [])
            .slice(0, 3)
            .map((a) => a.instruction)
            .filter((s): s is string => typeof s === 'string' && s.length > 0),
          whatToAvoid: (analysis.risks_summary?.descriptions ?? []).slice(0, 3),
        };

      setResultFromBurst(analysis, [], summary, resultPhotoUri);
      speak(analysis.voice_response);
      scanInProgress.current = false;
    } catch (e) {
      const msg = 'Analysis error. Check your connection and try again.';
      setScanError(msg);
      speak(msg);
      setScanPhase('idle');
      scanInProgress.current = false;
    }
  }, [active, setScanPhase, setResultFromBurst, speak]);

  // ── New scan (reset) ──────────────────────────────────────────────────────
  const handleNewScan = useCallback(() => {
    setScanError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    framesRef.current = [];
    clearAnalysis();
    setFrameCount(0);
    scanInProgress.current = false;
  }, [clearAnalysis]);

  const handleSummarizeRoom = useCallback(() => {
    const summary = computeRoomSummary(current, history);
    if (summary) {
      setRoomSummary(summary);
      speak(
        ['Safest: ' + summary.safest, ...summary.whatToDo.slice(0, 2)].join('. ')
      );
    }
  }, [current, history, setRoomSummary, speak]);

  const showResult = scan_phase === 'result';

  return (
    <View style={styles.container}>
      <HUD />
      {showResult ? (
        <>
          <ResultPhotoView />
          <View style={styles.controls}>
            <ControlBar onScan={handleNewScan} onSummarizeRoom={handleSummarizeRoom} scanPhase="result" />
          </View>
        </>
      ) : (
        <>
          {scanError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorTitle}>No result</Text>
              <Text style={styles.errorText}>{scanError}</Text>
            </View>
          ) : null}
          <View style={[styles.feed, { height: feedHeight }]}>
            <CameraPlaceholder ref={cameraRef} />
            <OverlayCanvas layoutWidth={width} layoutHeight={feedHeight} />

            {scan_phase === 'capturing' && (
              <View style={styles.phaseOverlay}>
                <Text style={styles.scanTitle}>Scanning room…</Text>
                <Text style={styles.scanHint}>Pan slowly around the room</Text>
                <Text style={styles.frameCount}>{frameCount} frames captured</Text>

                <Pressable style={styles.doneButton} onPress={handleDoneScanning}>
                  <Text style={styles.doneLabel}>Done ✓</Text>
                </Pressable>
              </View>
            )}

            {scan_phase === 'processing' && (
              <View style={styles.phaseOverlay}>
                <Text style={styles.processingTitle}>Analyzing room…</Text>
                <Text style={styles.processingSubtitle}>
                  Finding safe spots, hazards, and exit routes
                </Text>
              </View>
            )}
          </View>

          <IdentifiedList safe={identifiedSummary.safe} danger={identifiedSummary.danger} />
          <RoomSummaryCard />
          <ModeGuide />
          <View style={styles.controls}>
            <ControlBar onScan={handleScanRoom} onSummarizeRoom={handleSummarizeRoom} scanPhase={scan_phase} />
          </View>
        </>
      )}
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

  // ── Capture overlay ────────────────────────────────────────────────────────
  phaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scanTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  scanHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  frameCount: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  doneButton: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    backgroundColor: '#22c55e',
  },
  doneLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Processing overlay ─────────────────────────────────────────────────────
  processingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  processingSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ── Error banner (when analysis fails) ─────────────────────────────────────
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 14,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  errorText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    lineHeight: 20,
  },
});
