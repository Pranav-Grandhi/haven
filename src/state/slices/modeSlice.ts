import type { DisasterMode } from '../../types';

export interface ModeState {
  active: DisasterMode | null;
  threat_context: {
    direction: string | null;
    distance: string | null;
    notes: string | null;
  };
}

export const initialModeState: ModeState = {
  active: null,
  threat_context: {
    direction: null,
    distance: null,
    notes: null,
  },
};

export interface ModeActions {
  setMode: (mode: DisasterMode) => void;
  setThreatContext: (ctx: Partial<ModeState['threat_context']>) => void;
}

export function createModeSlice(set: (fn: (s: ModeState) => Partial<ModeState>) => void) {
  return {
    ...initialModeState,
    setMode: (mode: DisasterMode) => set(() => ({ active: mode })),
    setThreatContext: (ctx: Partial<ModeState['threat_context']>) =>
      set((s) => ({
        threat_context: { ...s.threat_context, ...ctx },
      })),
  };
}
