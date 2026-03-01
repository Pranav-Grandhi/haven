import React, { useRef, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, ScrollView } from 'react-native';
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
  const scan_context = useStore((s) => s.scan_context);
  const setScanContext = useStore((s) => s.setScanContext);
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
  /** When user taps Cancel during processing, skip applying the result. */
  const cancelledRef = useRef(false);

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
      const msg = 'To analyze your room, add your OpenAI API key. See the How to use tab for setup.';
      setScanError(msg);
      speak('Room analysis needs an API key. Check the How to use tab for setup.');
      setScanPhase('idle');
      scanInProgress.current = false;
      return;
    }

    setScanPhase('processing');
    cancelledRef.current = false;

    try {
      const result = await analyzeRoomWithLLM(frames, active as DisasterMode, scan_context);

      if (cancelledRef.current) return;
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
      if (cancelledRef.current) return;
      const msg = 'Something went wrong. Check your internet connection and try again.';
      setScanError(msg);
      speak(msg);
      setScanPhase('idle');
      scanInProgress.current = false;
    }
  }, [active, scan_context, setScanPhase, setResultFromBurst, speak]);

  // ── New scan (reset) ──────────────────────────────────────────────────────
  const handleNewScan = useCallback(() => {
    setScanError(null);
    cancelledRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    framesRef.current = [];
    clearAnalysis();
    setFrameCount(0);
    scanInProgress.current = false;
  }, [clearAnalysis]);

  const handleCancelAnalysis = useCallback(() => {
    cancelledRef.current = true;
    setScanPhase('idle');
    scanInProgress.current = false;
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

  const showResult = scan_phase === 'result';

  return (
    <View style={styles.container}>
      <HUD />
      {showResult ? (
        <>
          <ResultPhotoView />
          <ControlBar onScan={handleNewScan} onSummarizeRoom={handleSummarizeRoom} scanPhase="result" />
        </>
      ) : (
        <>
          {scanError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{scanError}</Text>
            </View>
          ) : null}
          <View style={[styles.feed, { height: feedHeight }]}>
            <CameraPlaceholder ref={cameraRef} />
            <OverlayCanvas layoutWidth={width} layoutHeight={feedHeight} />

            {scan_phase === 'capturing' && (
              <View style={styles.phaseOverlay}>
                <Text style={styles.scanTitle}>Scanning your room</Text>
                <Text style={styles.scanHint}>Move your phone slowly in a circle to capture the space</Text>
                <Text style={styles.frameCount}>{frameCount} photos captured</Text>

                <Pressable style={styles.doneButton} onPress={handleDoneScanning}>
                  <Text style={styles.doneLabel}>Done</Text>
                </Pressable>
              </View>
            )}

            {scan_phase === 'processing' && (
              <View style={styles.processingOverlayWrapper}>
                <View style={styles.processingCard}>
                  <ActivityIndicator size="large" color="#34d399" style={{ marginBottom: 12 }} />
                  <Text style={styles.processingTitle}>Analyzing your room</Text>
                  <Text style={styles.processingSubtitle}>
                    Finding safe spots, hazards, and ways out
                  </Text>
                  <Pressable style={styles.cancelButton} onPress={handleCancelAnalysis}>
                    <Text style={styles.cancelLabel}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <ScrollView style={styles.middleContent} contentContainerStyle={styles.middleContentInner}>
            <IdentifiedList safe={identifiedSummary.safe} danger={identifiedSummary.danger} />
            <RoomSummaryCard />
            <ModeGuide />
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Where</Text>
              <View style={styles.contextPills}>
                <Pressable
                  style={[styles.contextPill, scan_context === 'indoor' && styles.contextPillActive]}
                  onPress={() => setScanContext('indoor')}
                >
                  <Text style={[styles.contextPillText, scan_context === 'indoor' && styles.contextPillTextActive]}>
                    Indoor
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.contextPill, scan_context === 'outdoor' && styles.contextPillActive]}
                  onPress={() => setScanContext('outdoor')}
                >
                  <Text style={[styles.contextPillText, scan_context === 'outdoor' && styles.contextPillTextActive]}>
                    Outdoor
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
          <ControlBar onScan={handleScanRoom} onSummarizeRoom={handleSummarizeRoom} scanPhase={scan_phase} />
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
  middleContent: {
    flex: 1,
  },
  middleContentInner: {
    paddingBottom: 4,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 12,
  },
  contextLabel: {
    color: 'rgba(241,245,249,0.7)',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 40,
  },
  contextPills: {
    flexDirection: 'row',
    gap: 8,
  },
  contextPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  contextPillActive: {
    backgroundColor: 'rgba(59,130,246,0.35)',
    borderColor: 'rgba(96,165,250,0.5)',
  },
  contextPillText: {
    color: 'rgba(241,245,249,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  contextPillTextActive: {
    color: '#e0f2fe',
  },

  // ── Capture overlay ────────────────────────────────────────────────────────
  phaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,26,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  scanTitle: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scanHint: {
    color: 'rgba(241,245,249,0.78)',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  frameCount: {
    color: 'rgba(148,163,184,0.95)',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  doneButton: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 44,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  doneLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ── Processing overlay: compact card ───────────────────────────────────────
  processingOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  processingCard: {
    backgroundColor: 'rgba(26,26,46,0.96)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  processingTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  processingSubtitle: {
    color: 'rgba(148,163,184,0.95)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 19,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cancelLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Error banner ───────────────────────────────────────────────────────────
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.5)',
    borderRadius: 14,
    padding: 16,
  },
  errorTitle: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  errorText: {
    color: 'rgba(241,245,249,0.92)',
    fontSize: 13,
    lineHeight: 20,
  },
});
