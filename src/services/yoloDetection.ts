/**
 * YOLOv8 / YOLOv11 object detection via Roboflow Inference API.
 *
 * Why YOLO over DETR / OWL-ViT for detection:
 *  - Fastest inference of any architecture (single-pass, no attention maps)
 *  - Easily fine-tunable on custom indoor / structural datasets
 *    (ADE20K, SUN RGB-D, NYU Depth v2 — all have labeled windows, doors,
 *     shelves, stairs, ceilings, walls that COCO-80 lacks)
 *  - Roboflow hosts pre-trained and fine-tuned models with a simple REST API
 *  - Instance segmentation variant (YOLOv8-seg) gives exact shape of hazards,
 *    not just bounding boxes — useful for accurate zone overlay on the photo
 *
 * Setup:
 *  1. Create a Roboflow account (free tier available) at roboflow.com
 *  2. Use or fork a public indoor-objects workspace (see ROBOFLOW_MODEL below)
 *     OR upload images, label them with Roboflow Annotate, and train your own
 *  3. Set env vars below in .env
 *
 * To fine-tune for disaster objects (recommended):
 *  - Add classes: window, door, staircase, shelf, bookcase, hanging_fixture,
 *    mirror, electrical_panel, bathtub, closet, ceiling_fan
 *  - Pull images from ADE20K (uses MIT license) or SUN RGB-D
 *  - Train YOLOv8n or YOLOv8s (fast, small) on Roboflow — free for <10k images
 *  - Point EXPO_PUBLIC_ROBOFLOW_MODEL at your trained version
 */

import * as FileSystem from 'expo-file-system';
import type { DetectionResult, Detection, DetectionCategory } from '../types';

const ROBOFLOW_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_KEY ?? '';
/**
 * Format: "workspace/model-slug/version"
 * Default points to a public indoor-objects v8 model on Roboflow Universe.
 * Replace with your fine-tuned model for disaster-specific classes.
 */
const ROBOFLOW_MODEL = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL ?? 'indoor-objects-detection/1';
const ROBOFLOW_CONFIDENCE = 35; // minimum confidence % to report a detection

// ─── Label → category mapping ─────────────────────────────────────────────────
// Covers COCO classes + common indoor/structural classes present in fine-tuned models.
const LABEL_CATEGORY: Record<string, DetectionCategory> = {
  // Exits
  door: 'exits',
  staircase: 'exits',
  stairs: 'exits',
  stair: 'exits',
  'exit sign': 'exits',
  escalator: 'exits',
  // Structural / glass / falling hazards
  window: 'structural',
  shelf: 'structural',
  bookcase: 'structural',
  bookshelf: 'structural',
  mirror: 'structural',
  'ceiling fan': 'structural',
  'hanging light': 'structural',
  chandelier: 'structural',
  closet: 'structural',
  cabinet: 'structural',
  wall: 'structural',
  ceiling: 'structural',
  // Furniture / safe cover
  chair: 'furniture',
  couch: 'furniture',
  sofa: 'furniture',
  bed: 'furniture',
  table: 'furniture',
  'dining table': 'furniture',
  desk: 'furniture',
  bench: 'furniture',
  bathtub: 'furniture',
  toilet: 'furniture',
  // Electrical hazards
  'electrical panel': 'hazards',
  'electrical outlet': 'hazards',
  outlet: 'hazards',
  // Utilities / heavy appliances
  refrigerator: 'utilities',
  oven: 'utilities',
  microwave: 'utilities',
  sink: 'utilities',
  tv: 'utilities',
};

function toCategory(label: string): DetectionCategory {
  return LABEL_CATEGORY[label.toLowerCase()] ?? 'furniture';
}

interface RoboflowPrediction {
  x: number;       // center x in pixels
  y: number;       // center y in pixels
  width: number;   // box width in pixels
  height: number;  // box height in pixels
  class: string;
  confidence: number; // 0–1
  class_id: number;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: { width: number; height: number };
}

export function isYoloAvailable(): boolean {
  return !!ROBOFLOW_KEY;
}

export async function detectWithYolo(
  frameId: string,
  imageUri: string,
  imageWidth: number,
  imageHeight: number,
  timeoutMs = 15000
): Promise<DetectionResult | null> {
  if (!ROBOFLOW_KEY) return null;

  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  // Roboflow inference endpoint:
  // POST https://detect.roboflow.com/{model}?api_key=KEY&confidence=N
  // Body: raw base64 image (Content-Type: application/x-www-form-urlencoded)
  const url = `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_KEY}&confidence=${ROBOFLOW_CONFIDENCE}&overlap=25`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64,
      signal: controller.signal,
    });
    clearTimeout(tid);

    if (!res.ok) return null;

    const data: RoboflowResponse = await res.json();
    if (!data?.predictions?.length) return null;

    const imgW = data.image?.width || imageWidth;
    const imgH = data.image?.height || imageHeight;

    const detections: Detection[] = data.predictions
      .filter((p) => p.confidence >= ROBOFLOW_CONFIDENCE / 100)
      .slice(0, 30)
      .map((p, i) => {
        // Roboflow returns center-format bboxes; convert to corner-format normalized
        const x1 = Math.max(0, Math.min(1, (p.x - p.width / 2) / imgW));
        const y1 = Math.max(0, Math.min(1, (p.y - p.height / 2) / imgH));
        const x2 = Math.max(0, Math.min(1, (p.x + p.width / 2) / imgW));
        const y2 = Math.max(0, Math.min(1, (p.y + p.height / 2) / imgH));
        return {
          id: i + 1,
          label: p.class.toLowerCase(),
          category: toCategory(p.class),
          bbox: { x1, y1, x2, y2 },
          confidence: p.confidence,
          attributes: {
            estimated_height_m: null,
            anchored_to_wall: null,
            material: null,
            is_structural: null,
          },
        };
      });

    return {
      frame_id: frameId,
      timestamp: Date.now() / 1000,
      image_dimensions: { width: imgW, height: imgH },
      detections,
      scene_analysis: {
        room_type: 'indoor',
        estimated_floor_level: 1,
        has_exterior_wall: detections.some((d) => d.label === 'window'),
        window_coverage_percent: null,
      },
    };
  } catch {
    clearTimeout(tid);
    return null;
  }
}
