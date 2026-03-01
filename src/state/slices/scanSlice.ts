export interface ScanState {
  is_active: boolean;
  current_frame_id: string | null;
  frames_analyzed: number;
  last_analysis_timestamp: string | null;
}

export const initialScanState: ScanState = {
  is_active: false,
  current_frame_id: null,
  frames_analyzed: 0,
  last_analysis_timestamp: null,
};

export interface ScanActions {
  startScan: () => void;
  stopScan: () => void;
  setCurrentFrameId: (id: string | null) => void;
  setFramesAnalyzed: (n: number) => void;
  setLastAnalysisTimestamp: (ts: string | null) => void;
}

export function createScanSlice(set: (fn: (s: ScanState) => Partial<ScanState>) => void) {
  return {
    ...initialScanState,
    startScan: () => set(() => ({ is_active: true })),
    stopScan: () =>
      set(() => ({
        is_active: false,
        current_frame_id: null,
      })),
    setCurrentFrameId: (id: string | null) => set(() => ({ current_frame_id: id })),
    setFramesAnalyzed: (n: number) => set(() => ({ frames_analyzed: n })),
    setLastAnalysisTimestamp: (ts: string | null) => set(() => ({ last_analysis_timestamp: ts })),
  };
}
