import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../state/store';
import { detectObjects } from '../services/objectDetection';
import { detectWithCoreML } from '../services/coremlDetection';
import { detectWithHF, isHFDetectionAvailable } from '../services/hfDetection';
import { detectFromImageUrl, isCocoAvailable } from '../services/cocoDetection';
import { detectWithClaude, isClaudeDetectionAvailable } from '../services/claudeVisionDetection';
import { detectWithYolo, isYoloAvailable } from '../services/yoloDetection';
import { classifySafety } from '../services/aiSafetyClassifier';
import { updateZoneTracking } from '../utils/zoneTracker';
import type { FrameInput, DisasterMode } from '../types';

/**
 * Two-stage pipeline per frame:
 *
 *  STAGE 1 — Object Detection (what's in the image, where)
 *  ────────────────────────────────────────────────────────
 *  1. YOLOv8/v11 via Roboflow  — fastest; fine-tunable on indoor/structural
 *                                 classes (window, shelf, bathtub, staircase…).
 *                                 Requires EXPO_PUBLIC_ROBOFLOW_KEY.
 *  2. Claude Vision             — most accurate out-of-the-box; detects any
 *                                 label via text prompt. Requires EXPO_PUBLIC_ANTHROPIC_KEY.
 *  3. Core ML                   — on-device iOS, no network.
 *  4. HF OWL-ViT                — zero-shot text-prompted. Requires EXPO_PUBLIC_HF_TOKEN.
 *  5. COCO-SSD                  — web only, TF.js, 80 fixed classes.
 *  6. Mock                      — deterministic scenes, no keys needed.
 *
 *  STAGE 2 — Safety Classification (what to do with those detections)
 *  ─────────────────────────────────────────────────────────────────────
 *  Claude Haiku (claude-haiku-4-5) reasons over the detected object list and
 *  the active disaster mode to output safe / danger / exit zones with specific
 *  reasoning and actions. Falls back to rule-based keyword matching if the
 *  Anthropic key is absent.
 *
 * This separation means you can swap the detection model independently of the
 * classifier — e.g. swap in your fine-tuned YOLO without changing the Haiku
 * classification logic, or vice versa.
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
        const hasImage = !!(frame.image_uri && frame.image_width && frame.image_height);

        // ── Stage 1: Detection ──────────────────────────────────────────────

        // 1. YOLOv8/v11 — fast, fine-tunable on disaster-specific indoor classes
        if (!detection && hasImage && isYoloAvailable()) {
          detection = await detectWithYolo(
            frame.frame_id,
            frame.image_uri!,
            frame.image_width!,
            frame.image_height!
          );
        }

        // 2. Claude Vision — accurate for structural objects without fine-tuning
        if (!detection && hasImage && isClaudeDetectionAvailable()) {
          detection = await detectWithClaude(
            frame.frame_id,
            frame.image_uri!,
            frame.image_width!,
            frame.image_height!,
            mode as DisasterMode
          );
        }

        // 3. Core ML — on-device iOS, no network
        if (!detection && hasImage) {
          detection = await detectWithCoreML(
            frame.frame_id,
            frame.image_uri!,
            frame.image_width!,
            frame.image_height!
          );
        }

        // 4. HF OWL-ViT — zero-shot text-prompted (non-web)
        if (!detection && Platform.OS !== 'web' && isHFDetectionAvailable() && hasImage) {
          detection = await detectWithHF(
            frame.frame_id,
            frame.image_uri!,
            frame.image_width!,
            frame.image_height!
          );
        }

        // 5. COCO-SSD — web only
        if (!detection && Platform.OS === 'web' && isCocoAvailable() && hasImage) {
          detection = await detectFromImageUrl(
            frame.frame_id,
            frame.image_uri!,
            frame.image_width!,
            frame.image_height!
          );
        }

        // 6. Mock — deterministic test scenes
        if (!detection) {
          detection = await detectObjects({
            frameId: frame.frame_id,
            imageBase64: frame.image_data || '',
          });
        }

        // ── Stage 2: Safety classification (Claude Haiku → rule-based fallback)
        const analysis = await classifySafety(frame.frame_id, mode as DisasterMode, detection);

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
