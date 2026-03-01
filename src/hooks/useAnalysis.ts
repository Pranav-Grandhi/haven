import { useCallback } from 'react';
import { useStore } from '../state/store';
import { detectObjects } from '../services/objectDetection';
import { detectWithCoreML } from '../services/coremlDetection';
import { ruleBasedSafety } from '../services/ruleBasedSafety';
import { updateZoneTracking } from '../utils/zoneTracker';
import type { FrameInput } from '../types';

/**
 * Video input → Core ML (iOS) or mock detection → rule-based safety → overlay.
 * No cloud or GPT; all on-device when Core ML module is available.
 */
export function useAnalysis() {
  const mode = useStore((s) => s.active);
  const setAnalysis = useStore((s) => s.setAnalysis);
  const setTrackedZones = useStore((s) => s.setTrackedZones);
  const tracked_zones = useStore((s) => s.tracked_zones);
  const setCurrentFrameId = useStore((s) => s.setCurrentFrameId);
  const setLastAnalysisTimestamp = useStore((s) => s.setLastAnalysisTimestamp);
  const setFramesAnalyzed = useStore((s) => s.setFramesAnalyzed);

  const analyzeFrame = useCallback(
    async (frame: FrameInput): Promise<import('../types').SafetyAnalysis | null> => {
      if (!mode) return null;
      setCurrentFrameId(frame.frame_id);
      try {
        let detection = null;

        if (frame.image_uri && frame.image_width && frame.image_height) {
          detection = await detectWithCoreML(
            frame.frame_id,
            frame.image_uri,
            frame.image_width,
            frame.image_height
          );
        }

        if (!detection) {
          detection = await detectObjects({
            frameId: frame.frame_id,
            imageBase64: frame.image_data || '',
          });
        }

        const analysis = ruleBasedSafety(frame.frame_id, mode, detection);
        const nextTracked = updateZoneTracking(tracked_zones, analysis.zones);
        setTrackedZones(nextTracked);
        setAnalysis(analysis);
        setLastAnalysisTimestamp(analysis.analysis_timestamp);
        setFramesAnalyzed((useStore.getState() as any).frames_analyzed + 1);
        return analysis;
      } finally {
        setCurrentFrameId(null);
      }
    },
    [
      mode,
      tracked_zones,
      setAnalysis,
      setTrackedZones,
      setCurrentFrameId,
      setLastAnalysisTimestamp,
      setFramesAnalyzed,
    ]
  );

  return { analyzeFrame };
}
