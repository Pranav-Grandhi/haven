import { useEffect } from 'react';
import { useStore } from '../state/store';
import { useAnalysis } from './useAnalysis';

/**
 * Subscribes to currentFrame from store (set by video team or camera).
 * When a frame is set and we're in scanning mode, run analysis.
 */
export function useFrameReceiver(triggerAnalysis: boolean) {
  const currentFrame = useStore((s) => s.currentFrame);
  const is_active = useStore((s) => s.is_active);
  const setCurrentFrame = useStore((s) => s.setCurrentFrame);
  const { analyzeFrame } = useAnalysis();

  useEffect(() => {
    if (!currentFrame || !triggerAnalysis || !is_active) return;
    analyzeFrame(currentFrame).finally(() => {
      setCurrentFrame(null);
    });
  }, [currentFrame?.frame_id, triggerAnalysis, is_active, analyzeFrame, setCurrentFrame]);

  return { currentFrame };
}
