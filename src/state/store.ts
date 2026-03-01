import { create } from 'zustand';
import { createModeSlice, type ModeState, type ModeActions } from './slices/modeSlice';
import { createScanSlice, type ScanState, type ScanActions } from './slices/scanSlice';
import {
  createAnalysisSlice,
  type AnalysisState,
  type AnalysisActions,
} from './slices/analysisSlice';
import { createVoiceSlice, type VoiceState, type VoiceActions } from './slices/voiceSlice';
import { createUISlice, type UIState, type UIActions } from './slices/uiSlice';
import { createFrameSlice, type FrameState, type FrameActions } from './slices/frameSlice';

export type AppState = ModeState &
  ModeActions &
  ScanState &
  ScanActions &
  AnalysisState &
  AnalysisActions &
  VoiceState &
  VoiceActions &
  UIState &
  UIActions &
  FrameState &
  FrameActions;

export const useStore = create<AppState>()((set) => ({
  ...createModeSlice(set as any),
  ...createScanSlice(set as any),
  ...createAnalysisSlice(set as any),
  ...createVoiceSlice(set as any),
  ...createUISlice(set as any),
  ...createFrameSlice(set as any),
}));
