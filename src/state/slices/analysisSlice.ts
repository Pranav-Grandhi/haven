import type { SafetyAnalysis, TrackedZoneState } from '../../types';

export interface AnalysisState {
  current: SafetyAnalysis | null;
  history: SafetyAnalysis[];
  tracked_zones: TrackedZoneState;
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
};

export interface AnalysisActions {
  setAnalysis: (analysis: SafetyAnalysis) => void;
  setTrackedZones: (state: TrackedZoneState) => void;
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
        history: [analysis, ...s.history].slice(0, 10),
      })),
    setTrackedZones: (state: TrackedZoneState) =>
      set(() => ({ tracked_zones: state })),
    clearAnalysis: () =>
      set(() => ({
        current: null,
        tracked_zones: initialTrackedZones,
      })),
  };
}
