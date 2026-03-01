import React, { useRef, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, ScrollView } from 'react-native';
import { ResultPhotoView } from '@/src/components/ResultPhotoView';
import { CameraPlaceholder, type CameraCaptureRef } from '@/src/components/CameraPlaceholder';
import { useStore } from '@/src/state/store';
import { useSpeechSynthesis } from '@/src/hooks/useSpeechSynthesis';
import { use360Scan } from '@/src/hooks/use360Scan';
import { analyzeRoomWithLLM } from '@/src/services/llmAnalysis';
import { computeRoomSummary } from '@/src/utils/roomSummary';
import { ALL_MODES, DISASTER_MODES } from '@/src/constants/disasterModes';
import type { DisasterMode } from '@/src/types';
import type { ScanFrame } from '@/src/hooks/use360Scan';

type FlowScreen = 'context' | 'select' | 'camera' | 'result';

export default function HavenScreen() {
  const { width, height } = useWindowDimensions();
  const feedHeight = height * 0.55;
  const cameraRef = useRef<CameraCaptureRef>(null);
  const { speak } = useSpeechSynthesis();

  const clearAnalysis = useStore((s) => s.clearAnalysis);
  const active = useStore((s) => s.active);
  const scan_context = useStore((s) => s.scan_context);
  const setScanContext = useStore((s) => s.setScanContext);
  const setMode = useStore((s) => s.setMode);
  const scan_phase = useStore((s) => s.scan_phase);
  const setScanPhase = useStore((s) => s.setScanPhase);
  const setResultFromBurst = useStore((s) => s.setResultFromBurst);
  const setRoomSummary = useStore((s) => s.setRoomSummary);
  const current = useStore((s) => s.current);
  const history = useStore((s) => s.history);

  const [flowScreen, setFlowScreen] = useState<FlowScreen>('context');
  const [frameCount, setFrameCount] = useState(0);
  const [scanProgressDeg, setScanProgressDeg] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanInProgress = useRef(false);
  const cancelledRef = useRef(false);
  const scanPromiseRef = useRef<Promise<ScanFrame[]> | null>(null);

  const { start: startGyroScan, cancel: cancelGyroScan } = use360Scan({
    cameraRef: cameraRef as React.RefObject<CameraCaptureRef>,
    onProgress: (deg) => setScanProgressDeg(Math.round(deg)),
    onFrame: (_, index) => setFrameCount(index + 1),
  });

  // ── Run analysis on captured frames ─────────────────────────────────────
  const runAnalysis = useCallback(
    async (frames: ScanFrame[]) => {
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
        setFlowScreen('result');
      } catch (e) {
        if (cancelledRef.current) return;
        const msg = 'Something went wrong. Check your internet connection and try again.';
        setScanError(msg);
        speak(msg);
        setScanPhase('idle');
        scanInProgress.current = false;
      }
    },
    [active, scan_context, setScanPhase, setResultFromBurst, speak]
  );

  // ── Start gyro scan ──────────────────────────────────────────────────────
  const handleScanRoom = useCallback(async () => {
    if (!active || scanInProgress.current) return;
    scanInProgress.current = true;
    setScanError(null);
    clearAnalysis();
    setFrameCount(0);
    setScanProgressDeg(0);
    setScanPhase('capturing');
    scanPromiseRef.current = startGyroScan();
  }, [active, clearAnalysis, setScanPhase, startGyroScan]);

  // ── User taps "I'm done" ──────────────────────────────────────────────────
  const handleDoneScanning = useCallback(async () => {
    setScanError(null);
    cancelGyroScan();
    const promise = scanPromiseRef.current;
    scanPromiseRef.current = null;
    if (!promise) {
      setScanPhase('idle');
      scanInProgress.current = false;
      return;
    }
    try {
      const frames = await promise;
      await runAnalysis(frames);
    } catch {
      setScanPhase('idle');
      scanInProgress.current = false;
    }
  }, [cancelGyroScan, runAnalysis, setScanPhase]);

  // ── Back from camera → disaster select ───────────────────────────────────
  const handleBackFromCamera = useCallback(() => {
    cancelGyroScan();
    scanPromiseRef.current = null;
    setFrameCount(0);
    setScanProgressDeg(0);
    setScanPhase('idle');
    scanInProgress.current = false;
    setFlowScreen('select');
  }, [cancelGyroScan, setScanPhase]);

  // ── New scan → back to first step ──────────────────────────────────────────
  const handleNewScan = useCallback(() => {
    setScanError(null);
    cancelledRef.current = true;
    clearAnalysis();
    setFrameCount(0);
    scanInProgress.current = false;
    setFlowScreen('context');
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
      speak(['Safest: ' + summary.safest, ...summary.whatToDo.slice(0, 2)].join('. '));
    }
  }, [current, history, setRoomSummary, speak]);

  // ── Screen 1: Inside or Outside ───────────────────────────────────────────
  if (flowScreen === 'context') {
    return (
      <View style={styles.container}>
        <View style={styles.flowContent}>
          <Text style={styles.flowTitle}>Is the disaster inside or outside?</Text>
          <View style={styles.contextChoiceRow}>
            <Pressable
              style={[styles.contextChoiceCard, styles.contextChoiceCardLeft]}
              onPress={() => {
                setScanContext('indoor');
                setFlowScreen('select');
              }}
            >
              <Text style={styles.contextChoiceEmoji}>🏠</Text>
              <Text style={styles.contextChoiceLabel}>Inside</Text>
              <Text style={styles.contextChoiceHint}>Room or building</Text>
            </Pressable>
            <Pressable
              style={[styles.contextChoiceCard, styles.contextChoiceCardRight]}
              onPress={() => {
                setScanContext('outdoor');
                setFlowScreen('select');
              }}
            >
              <Text style={styles.contextChoiceEmoji}>🌳</Text>
              <Text style={styles.contextChoiceLabel}>Outside</Text>
              <Text style={styles.contextChoiceHint}>Street, yard, or open area</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Screen 2: Vertical disaster list ──────────────────────────────────────
  if (flowScreen === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.flowContent}>
          <Text style={styles.flowTitle}>What type of disaster?</Text>
          <ScrollView style={styles.modeList} contentContainerStyle={styles.modeListInner} showsVerticalScrollIndicator>
            {ALL_MODES.map((mode) => (
              <Pressable
                key={mode}
                style={styles.modeRow}
                onPress={() => {
                  setMode(mode);
                  setScanPhase('idle');
                  setFlowScreen('camera');
                }}
              >
                <Text style={styles.modeEmoji}>{DISASTER_MODES[mode].emoji}</Text>
                <Text style={styles.modeLabel}>{DISASTER_MODES[mode].label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Screen 4: Result ─────────────────────────────────────────────────────
  if (flowScreen === 'result') {
    return (
      <View style={styles.container}>
        <View style={styles.resultWrap}>
          <ResultPhotoView />
        </View>
        <View style={styles.resultBar}>
          <Pressable style={styles.newScanButton} onPress={handleNewScan}>
            <Text style={styles.newScanLabel}>New scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Screen 3: Camera with Back, gyro scan, I'm done ───────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.cameraTopBar}>
        <Pressable style={styles.backButton} onPress={handleBackFromCamera}>
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>
        <Text style={styles.cameraTitle} numberOfLines={1}>
          {active ? DISASTER_MODES[active].label : 'Scan'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {scanError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{scanError}</Text>
        </View>
      ) : null}

      <View style={[styles.feed, { height: feedHeight }]}>
        <CameraPlaceholder ref={cameraRef} />

        {scan_phase === 'idle' && (
          <View style={styles.scanPromptOverlay}>
            <Text style={styles.scanPromptText}>Tap below to start scanning</Text>
            <Pressable style={styles.scanRoomButton} onPress={handleScanRoom}>
              <Text style={styles.scanRoomLabel}>Scan room</Text>
            </Pressable>
          </View>
        )}

        {scan_phase === 'capturing' && (
          <View style={styles.phaseOverlay}>
            <Text style={styles.scanTitle}>Scanning</Text>
            <Text style={styles.scanHint}>Move your phone slowly to capture the space. Tap I'm done when finished.</Text>
            <Text style={styles.frameCount}>{frameCount} photos · {scanProgressDeg}°</Text>
            <Pressable style={styles.doneButton} onPress={handleDoneScanning}>
              <Text style={styles.doneLabel}>I'm done</Text>
            </Pressable>
          </View>
        )}

        {scan_phase === 'processing' && (
          <View style={styles.processingOverlayWrapper}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#34d399" style={{ marginBottom: 12 }} />
              <Text style={styles.processingTitle}>Analyzing</Text>
              <Text style={styles.processingSubtitle}>Finding safe spots, hazards, and ways out</Text>
              <Pressable style={styles.cancelButton} onPress={handleCancelAnalysis}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },

  // ── Flow screens (context, select) ────────────────────────────────────────
  flowContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  flowTitle: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 28,
    textAlign: 'center',
  },
  contextChoiceRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  contextChoiceCard: {
    flex: 1,
    maxWidth: 160,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  contextChoiceCardLeft: {},
  contextChoiceCardRight: {},
  contextChoiceEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  contextChoiceLabel: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  contextChoiceHint: {
    color: 'rgba(241,245,249,0.65)',
    fontSize: 13,
  },
  modeList: {
    flex: 1,
  },
  modeListInner: {
    paddingBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  modeLabel: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '600',
  },

  // ── Result screen ─────────────────────────────────────────────────────────
  resultWrap: {
    flex: 1,
    minHeight: 0,
  },
  resultBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  newScanButton: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.4)',
    alignItems: 'center',
  },
  newScanLabel: {
    color: '#93c5fd',
    fontSize: 17,
    fontWeight: '700',
  },

  // ── Camera screen ────────────────────────────────────────────────────────
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backLabel: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraTitle: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  feed: {
    width: '100%',
    overflow: 'hidden',
  },
  scanPromptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,26,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 48,
  },
  scanPromptText: {
    color: 'rgba(241,245,249,0.8)',
    fontSize: 15,
    marginBottom: 16,
  },
  scanRoomButton: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
  },
  scanRoomLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
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
