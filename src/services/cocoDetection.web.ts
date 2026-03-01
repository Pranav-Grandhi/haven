/**
 * Object detection using TensorFlow.js COCO-SSD in the browser.
 * Used on web when Core ML is not available; returns real detections with bboxes.
 * This file is only bundled for web (cocoDetection.ts is the native stub).
 */

import type { DetectionResult, Detection, DetectionCategory } from '../types';

const COCO_TO_CATEGORY: Record<string, DetectionCategory> = {
  chair: 'furniture',
  couch: 'furniture',
  bed: 'furniture',
  'dining table': 'furniture',
  toilet: 'furniture',
  tv: 'furniture',
  laptop: 'furniture',
  mouse: 'furniture',
  remote: 'furniture',
  keyboard: 'furniture',
  'cell phone': 'furniture',
  book: 'furniture',
  clock: 'furniture',
  vase: 'furniture',
  bottle: 'furniture',
  'wine glass': 'furniture',
  cup: 'furniture',
  fork: 'furniture',
  knife: 'furniture',
  spoon: 'furniture',
  bowl: 'furniture',
  microwave: 'utilities',
  oven: 'utilities',
  toaster: 'utilities',
  sink: 'utilities',
  refrigerator: 'utilities',
  'potted plant': 'furniture',
  person: 'furniture',
  bench: 'furniture',
};

/** Map COCO class to a label our rule engine understands (e.g. "dining table" -> "table"). */
const COCO_TO_LABEL: Record<string, string> = {
  'dining table': 'table',
  couch: 'couch',
  'potted plant': 'plant',
  'cell phone': 'phone',
  'wine glass': 'glass',
  tv: 'tv',
};

function mapCategory(className: string): DetectionCategory {
  const key = className.toLowerCase();
  return COCO_TO_CATEGORY[key] ?? 'furniture';
}

function mapLabel(className: string): string {
  const key = className.toLowerCase();
  return COCO_TO_LABEL[key] ?? key;
}

let modelPromise: Promise<any> | null = null;

function getModel() {
  if (modelPromise) return modelPromise;
  if (typeof window === 'undefined') return null;
  modelPromise = (async () => {
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    await import('@tensorflow/tfjs-backend-webgl');
    return cocoSsd.load();
  })();
  return modelPromise;
}

/**
 * Detect objects from an image URL (blob or data URL) on web only.
 * Returns null if not in browser or model fails.
 */
export async function detectFromImageUrl(
  frameId: string,
  imageUrl: string,
  imageWidth: number,
  imageHeight: number
): Promise<DetectionResult | null> {
  if (typeof window === 'undefined' || !imageUrl) return null;
  const model = await getModel();
  if (!model) return null;

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = document.createElement('img');
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = imageUrl;
  });
  if (!img) return null;

  try {
    const predictions = await model.detect(img);
    if (!predictions?.length) return null;

    const w = img.naturalWidth || imageWidth;
    const h = img.naturalHeight || imageHeight;

    const detections: Detection[] = predictions.map((p: { bbox: number[]; class: string; score: number }, i: number) => {
      const [x, y, bw, bh] = p.bbox;
      return {
        id: i + 1,
        label: mapLabel(p.class),
        category: mapCategory(p.class),
        bbox: {
          x1: Math.max(0, Math.min(1, x / w)),
          y1: Math.max(0, Math.min(1, y / h)),
          x2: Math.max(0, Math.min(1, (x + bw) / w)),
          y2: Math.max(0, Math.min(1, (y + bh) / h)),
        },
        confidence: p.score,
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
      image_dimensions: { width: imageWidth, height: imageHeight },
      detections,
      scene_analysis: {
        room_type: 'indoor',
        estimated_floor_level: 1,
        has_exterior_wall: null,
        window_coverage_percent: null,
      },
    };
  } catch {
    return null;
  }
}

/** True when running in a browser so COCO-SSD can be used. */
export function isCocoAvailable(): boolean {
  return typeof window !== 'undefined';
}
