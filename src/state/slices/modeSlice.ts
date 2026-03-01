import type { DisasterMode } from '../../types';

export type ScanContext = 'indoor' | 'outdoor';

export interface ModeState {
  active: DisasterMode | null;
  /** Whether the user is scanning a room (indoor) or an outdoor space. */
  scan_context: ScanContext;
  threat_context: {
    direction: string | null;
    distance: string | null;
    notes: string | null;
  };
}

export const initialModeState: ModeState = {
  active: null,
  scan_context: 'indoor',
  threat_context: {
    direction: null,
    distance: null,
    notes: null,
  },
};

export interface ModeActions {
  setMode: (mode: DisasterMode) => void;
  setScanContext: (context: ScanContext) => void;
  setThreatContext: (ctx: Partial<ModeState['threat_context']>) => void;
}

export function createModeSlice(set: (fn: (s: ModeState) => Partial<ModeState>) => void) {
  return {
    ...initialModeState,
    setMode: (mode: DisasterMode) => set(() => ({ active: mode })),
    setScanContext: (scan_context: ScanContext) => set(() => ({ scan_context })),
    setThreatContext: (ctx: Partial<ModeState['threat_context']>) =>
      set((s) => ({
        threat_context: { ...s.threat_context, ...ctx },
      })),
  };
}
