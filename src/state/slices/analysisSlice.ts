import type { SafetyAnalysis, TrackedZoneState } from '../../types';

export interface RoomSummary {
  safest: string;
  whatToDo: string[];
  whatToAvoid: string[];
}

export type ScanPhase = 'idle' | 'capturing' | 'processing' | 'result';

export interface AnalysisState {
  current: SafetyAnalysis | null;
  history: SafetyAnalysis[];
  tracked_zones: TrackedZoneState;
  room_summary: RoomSummary | null;
  scan_phase: ScanPhase;
  result_photo_uri: string | null;
  scan_capture_progress: number; // 0 = none, 1..N = current frame index during 360 capture
}

const initialTrackedZones: TrackedZoneState = {
  tracked_zones: {},
  frame_count: 0,
  last_major_scene_change: 0,
};

export const initialAnalysisState: AnalysisState = {
  current: null,
  history: [],
  tracked_zones: initialTrackedZones,
  room_summary: null,
  scan_phase: 'idle',
  result_photo_uri: null,
  scan_capture_progress: 0,
};

export interface AnalysisActions {
  setAnalysis: (analysis: SafetyAnalysis) => void;
  setTrackedZones: (state: TrackedZoneState) => void;
  setRoomSummary: (summary: RoomSummary | null) => void;
  setScanPhase: (phase: ScanPhase) => void;
  setScanCaptureProgress: (n: number) => void;
  setResultPhoto: (uri: string | null) => void;
  setResultFromBurst: (best: SafetyAnalysis, all: SafetyAnalysis[], summary: RoomSummary, representativeUri: string) => void;
  clearAnalysis: () => void;
}

export function createAnalysisSlice(
  set: (fn: (s: AnalysisState) => Partial<AnalysisState>) => void
) {
  return {
    ...initialAnalysisState,
    setAnalysis: (analysis: SafetyAnalysis) =>
      set((s) => ({
        current: analysis,
        history: [analysis, ...s.history].slice(0, 30),
      })),
    setTrackedZones: (state: TrackedZoneState) =>
      set(() => ({ tracked_zones: state })),
    setRoomSummary: (summary: RoomSummary | null) =>
      set(() => ({ room_summary: summary })),
    setScanPhase: (phase: ScanPhase) =>
      set(() => ({ scan_phase: phase, scan_capture_progress: 0 })),
    setScanCaptureProgress: (n: number) =>
      set(() => ({ scan_capture_progress: n })),
    setResultPhoto: (uri: string | null) =>
      set(() => ({ result_photo_uri: uri })),
    setResultFromBurst: (best, all, summary, representativeUri) =>
      set(() => ({
        current: best,
        history: all.filter((a) => a.frame_id !== best.frame_id),
        room_summary: summary,
        result_photo_uri: representativeUri,
        scan_phase: 'result',
      })),
    clearAnalysis: () =>
      set(() => ({
        current: null,
        history: [],
        tracked_zones: initialTrackedZones,
        room_summary: null,
        scan_phase: 'idle',
        result_photo_uri: null,
        scan_capture_progress: 0,
      })),
  };
}
