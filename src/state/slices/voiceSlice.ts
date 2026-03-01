import type { RecordingState } from '../../types';

export interface VoiceState {
  recording_state: RecordingState;
  last_transcription: string | null;
  tts_enabled: boolean;
  is_speaking: boolean;
}

export const initialVoiceState: VoiceState = {
  recording_state: 'idle',
  last_transcription: null,
  tts_enabled: true,
  is_speaking: false,
};

export interface VoiceActions {
  setRecordingState: (state: RecordingState) => void;
  setLastTranscription: (text: string | null) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setIsSpeaking: (speaking: boolean) => void;
}

export function createVoiceSlice(set: (fn: (s: VoiceState) => Partial<VoiceState>) => void) {
  return {
    ...initialVoiceState,
    setRecordingState: (state: RecordingState) => set(() => ({ recording_state: state })),
    setLastTranscription: (text: string | null) => set(() => ({ last_transcription: text })),
    setTtsEnabled: (enabled: boolean) => set(() => ({ tts_enabled: enabled })),
    setIsSpeaking: (speaking: boolean) => set(() => ({ is_speaking: speaking })),
  };
}
