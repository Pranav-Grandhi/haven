import { useCallback } from 'react';
import * as Speech from 'expo-speech';
import { useStore } from '../state/store';

const TTS_OPTIONS = {
  language: 'en-US',
  rate: 1.1,
  pitch: 1.0,
};

export function useSpeechSynthesis() {
  const tts_enabled = useStore((s) => s.tts_enabled);
  const setIsSpeaking = useStore((s) => s.setIsSpeaking);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!tts_enabled || !text.trim()) {
        onDone?.();
        return;
      }
      setIsSpeaking(true);
      Speech.speak(text, {
        ...TTS_OPTIONS,
        onDone: () => {
          setIsSpeaking(false);
          onDone?.();
        },
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [tts_enabled, setIsSpeaking]
  );

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  return { speak, stop, isEnabled: tts_enabled };
}
