/**
 * Object detection using the Expo Core ML module (Vision on iOS).
 * Returns DetectionResult for use with rule-based safety.
 */

import type { DetectionResult, Detection, DetectionCategory } from '../types';

const LABEL_TO_CATEGORY: Record<string, DetectionCategory> = {
  window: 'structural',
  door: 'structural',
  wall: 'structural',
  furniture: 'furniture',
  desk: 'furniture',
  table: 'furniture',
  chair: 'furniture',
  indoor: 'structural',
  room: 'structural',
  building: 'structural',
  floor: 'structural',
  ceiling: 'structural',
  stair: 'exits',
  exit: 'exits',
  hazard: 'hazards',
  fire: 'hazards',
  water: 'hazards',
};

function mapCategory(label: string): DetectionCategory {
  const lower = label.toLowerCase();
  for (const [key, cat] of Object.entries(LABEL_TO_CATEGORY)) {
    if (lower.includes(key)) return cat;
  }
  return 'furniture';
}

/**
 * Run Core ML / Vision detection on an image URI (file:// or content://).
 * Returns null if the native module is not available (e.g. Expo Go).
 */
export async function detectWithCoreML(
  frameId: string,
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<DetectionResult | null> {
  try {
    const coreml = require('expo-coreml-detection');
    const detectFromImageAsync = coreml?.detectFromImageAsync;
    if (typeof detectFromImageAsync !== 'function') return null;
    const raw = await detectFromImageAsync(imageUri);
    if (!raw?.length) return null;

    const detections: Detection[] = raw.map((r: { id: number; label: string; confidence: number; x1: number; y1: number; x2: number; y2: number }) => ({
      id: r.id,
      label: r.label,
      category: mapCategory(r.label),
      bbox: { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 },
      confidence: r.confidence,
      attributes: {
        estimated_height_m: null,
        anchored_to_wall: null,
        material: null,
        is_structural: null,
      },
    }));

    return {
      frame_id: frameId,
      timestamp: Date.now() / 1000,
      image_dimensions: { width: imageWidth, height: imageHeight },
      detections,
      scene_analysis: {
        room_type: 'indoor',
        estimated_floor_level: 1,
        has_exterior_wall: detections.some((d) => d.label.toLowerCase().includes('window')),
        window_coverage_percent: null,
      },
    };
  } catch {
    return null;
  }
}
