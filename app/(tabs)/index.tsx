import React, { useRef, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, ScrollView } from 'react-native';
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
import { THEME } from '@/src/constants/colors';
import { DISASTER_MODES, ALL_MODES } from '@/src/constants/disasterModes';

/** Gyro: capture a new frame only after this many degrees of rotation (avoids overlapping frames). */
const CAPTURE_EVERY_DEG = 15;
/** Fallback when gyro unavailable: interval in ms between frames. */
const FALLBACK_INTERVAL_MS = 800;
const GYRO_POLL_MS = 50;
const NOISE_FLOOR_RADS = 0.05;

export default function ShelterScanScreen() {
  const { width, height } = useWindowDimensions();
  const feedHeight = height * 0.55;
  const cameraRef = useRef<CameraCaptureRef>(null);
  const { speak } = useSpeechSynthesis();

  const clearAnalysis = useStore((s) => s.clearAnalysis);
  const active = useStore((s) => s.active);
  const setMode = useStore((s) => s.setMode);
  const scan_phase = useStore((s) => s.scan_phase);
  const setScanPhase = useStore((s) => s.setScanPhase);
  const setResultFromBurst = useStore((s) => s.setResultFromBurst);
  const setRoomSummary = useStore((s) => s.setRoomSummary);
  const current = useStore((s) => s.current);
  const history = useStore((s) => s.history);
  const { identifiedSummary } = useZoneTracking();

  /** Flow: select disaster → camera scan → result. */
  const [flowScreen, setFlowScreen] = useState<'select' | 'camera' | 'result'>('select');
  const [frameCount, setFrameCount] = useState(0);
  /** Shown on screen when analysis fails so user sees why there's no result. */
  const [scanError, setScanError] = useState<string | null>(null);

  /** Accumulated frames during the free-form scan. */
  const framesRef = useRef<ScanFrame[]>([]);
  /** setInterval handle (fallback when gyro unavailable). */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Gyroscope subscription — capture only when device has rotated CAPTURE_EVERY_DEG. */
  const gyroSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const scanInProgress = useRef(false);

  const captureFrame = useCallback(async (frameIndex: number): Promise<ScanFrame | null> => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8, base64: true });
    if (!photo) return null;
    return {
      uri: photo.uri,
      frame_id: `frame_${frameIndex}`,
      width: photo.width,
      height: photo.height,
      base64: photo.base64 ?? undefined,
    };
  }, []);

  // ── Start free-form scan (gyro-driven when available, else interval) ────────
  const handleScanRoom = useCallback(async () => {
    if (!active || scanInProgress.current) return;
    scanInProgress.current = true;
    clearAnalysis();
    framesRef.current = [];
    setFrameCount(0);
    setScanPhase('capturing');

    let frameIndex = 0;
    let capturing = false;

    const addFrame = (frame: ScanFrame) => {
      framesRef.current = [...framesRef.current, frame];
      setFrameCount(framesRef.current.length);
    };

    const tryGyro = () => {
      try {
        const { Gyroscope } = require('expo-sensors');
        if (!Gyroscope) return false;

        let cumDeg = 0;
        let lastCaptureDeg = 0;
        let lastTime = 0;

        Gyroscope.setUpdateInterval(GYRO_POLL_MS);

        const sub = Gyroscope.addListener(async ({ x, y, z }: { x: number; y: number; z: number }) => {
          const now = Date.now();
          if (lastTime === 0) {
            lastTime = now;
            lastCaptureDeg = 0;
            capturing = true;
            const f = await captureFrame(frameIndex++);
            if (f) addFrame(f);
            capturing = false;
            return;
          }

          const dt = Math.min((now - lastTime) / 1000, 0.15);
          lastTime = now;
          const rate = Math.max(Math.abs(z), Math.abs(y) * 0.6, Math.abs(x) * 0.3);

          if (rate > NOISE_FLOOR_RADS) {
            cumDeg += rate * (180 / Math.PI) * dt;
          }

          if (!capturing && cumDeg - lastCaptureDeg >= CAPTURE_EVERY_DEG) {
            lastCaptureDeg = cumDeg;
            capturing = true;
            const f = await captureFrame(frameIndex++);
            if (f) addFrame(f);
            capturing = false;
          }
        });

        gyroSubscriptionRef.current = sub;
        return true;
      } catch {
        return false;
      }
    };

    if (Platform.OS !== 'web' && tryGyro()) {
      return;
    }

    gyroSubscriptionRef.current = null;
    intervalRef.current = setInterval(async () => {
      const f = await captureFrame(frameIndex++);
      if (f) addFrame(f);
    }, FALLBACK_INTERVAL_MS);
  }, [active, clearAnalysis, setScanPhase, captureFrame]);

  // ── User taps "Done" ──────────────────────────────────────────────────────
  const handleDoneScanning = useCallback(async () => {
    setScanError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gyroSubscriptionRef.current) {
      gyroSubscriptionRef.current.remove();
      gyroSubscriptionRef.current = null;
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
      setFlowScreen('result');
    } catch (e) {
      const msg = 'Analysis error. Check your connection and try again.';
      setScanError(msg);
      speak(msg);
      setScanPhase('idle');
      scanInProgress.current = false;
    }
  }, [active, setScanPhase, setResultFromBurst, speak]);

  // ── New scan (reset) → go back to disaster select ─────────────────────────
  const handleNewScan = useCallback(() => {
    setScanError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gyroSubscriptionRef.current) {
      gyroSubscriptionRef.current.remove();
      gyroSubscriptionRef.current = null;
    }
    framesRef.current = [];
    clearAnalysis();
    setFrameCount(0);
    scanInProgress.current = false;
    setFlowScreen('select');
  }, [clearAnalysis]);

  // ── Back from camera → disaster select ────────────────────────────────────
  const handleBackFromCamera = useCallback(() => {
    setScanError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gyroSubscriptionRef.current) {
      gyroSubscriptionRef.current.remove();
      gyroSubscriptionRef.current = null;
    }
    framesRef.current = [];
    setFrameCount(0);
    scanInProgress.current = false;
    setScanPhase('idle');
    setFlowScreen('select');
  }, [setScanPhase]);

  const handleSummarizeRoom = useCallback(() => {
    const summary = computeRoomSummary(current, history);
    if (summary) {
      setRoomSummary(summary);
      speak(
        ['Safest: ' + summary.safest, ...summary.whatToDo.slice(0, 2)].join('. ')
      );
    }
  }, [current, history, setRoomSummary, speak]);

  // ─── Screen 1: Disaster selection (first thing user sees) ───────────────────
  if (flowScreen === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.selectWrap}>
          <Text style={styles.selectTitle}>What type of disaster?</Text>
          <Text style={styles.selectSubtitle}>Choose one to scan your room for safe spots</Text>
          <ScrollView style={styles.selectScroll} contentContainerStyle={styles.selectScrollContent} showsVerticalScrollIndicator={false}>
            {ALL_MODES.map((mode) => {
              const config = DISASTER_MODES[mode];
              return (
                <Pressable
                  key={mode}
                  style={styles.selectOption}
                  onPress={() => {
                    setMode(mode);
                    setScanPhase('idle');
                    setFlowScreen('camera');
                  }}
                >
                  <Text style={styles.selectOptionLabel}>{config.label}</Text>
                  <Text style={styles.selectOptionArrow}>→</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  }

  // ─── Screen 2: Camera only + Back ──────────────────────────────────────────
  if (flowScreen === 'camera') {
    return (
      <View style={styles.container}>
        <View style={styles.cameraTopBar}>
          <Pressable style={styles.backButton} onPress={handleBackFromCamera}>
            <Text style={styles.backButtonLabel}>← Back</Text>
          </Pressable>
          <Text style={styles.cameraModeLabel}>{active ? DISASTER_MODES[active].label : ''}</Text>
          <View style={styles.backButton} />
        </View>
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
              <Text style={styles.scanHint}>Pan around — a photo is taken every ~15° (no duplicates)</Text>
              <Text style={styles.frameCount}>{frameCount} frames captured</Text>
              <Pressable style={styles.doneButton} onPress={handleDoneScanning}>
                <Text style={styles.doneLabel}>I'm done ✓</Text>
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
        {scan_phase === 'idle' && (
          <View style={styles.cameraBottomBar}>
            <Pressable style={styles.scanRoomButton} onPress={handleScanRoom}>
              <Text style={styles.doneLabel}>Scan room</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ─── Screen 3: Result (suggestions, safest place, etc.) ────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.resultWrap}>
        <ResultPhotoView />
        <View style={styles.controlsResult}>
          <Pressable style={styles.newScanButton} onPress={handleNewScan}>
            <Text style={styles.newScanLabel}>New scan</Text>
          </Pressable>
        </View>
      </View>
      <DetailCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },

  // ─── Disaster select screen ───────────────────────────────────────────────
  selectWrap: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  selectTitle: {
    color: THEME.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectSubtitle: {
    color: THEME.textMuted,
    fontSize: 16,
    marginBottom: 32,
  },
  selectScroll: { flex: 1 },
  selectScrollContent: { paddingBottom: 32 },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.surfaceBorder,
    borderRadius: THEME.radiusCard,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  selectOptionLabel: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: '700',
  },
  selectOptionArrow: {
    color: THEME.textMuted,
    fontSize: 20,
    fontWeight: '600',
  },

  // ─── Camera screen top bar ──────────────────────────────────────────────
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceBorder,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  backButtonLabel: {
    color: THEME.exit,
    fontSize: 16,
    fontWeight: '700',
  },
  cameraModeLabel: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraBottomBar: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.surfaceBorder,
    alignItems: 'center',
  },
  scanRoomButton: {
    backgroundColor: THEME.safe,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: THEME.radiusCard,
    minWidth: 200,
    alignItems: 'center',
  },
  newScanButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: THEME.radiusCard,
    backgroundColor: THEME.exitBg,
    borderWidth: 1.5,
    borderColor: THEME.exit,
    alignSelf: 'center',
  },
  newScanLabel: {
    color: THEME.exit,
    fontSize: 16,
    fontWeight: '700',
  },

  resultWrap: {
    flex: 1,
    minHeight: 0,
  },
  controls: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  controlsResult: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.surfaceBorder,
    alignItems: 'center',
  },
  feed: {
    width: '100%',
    overflow: 'hidden',
  },

  phaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  scanTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scanHint: {
    color: THEME.textMuted,
    fontSize: 15,
  },
  frameCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  doneButton: {
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 52,
    borderRadius: THEME.radiusCard,
    backgroundColor: THEME.safe,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  doneLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  processingTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: '700',
  },
  processingSubtitle: {
    color: THEME.textMuted,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: THEME.dangerBg,
    borderWidth: 1.5,
    borderColor: THEME.danger,
    borderRadius: THEME.radiusCard,
    padding: 16,
  },
  errorTitle: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  errorText: {
    color: THEME.text,
    fontSize: 13,
    lineHeight: 20,
  },
});
