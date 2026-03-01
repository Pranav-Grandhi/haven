/**
 * Object detection via Hugging Face Inference API using OWL-ViT.
 * OWL-ViT is a zero-shot, text-prompted detector — we hand it exactly the
 * disaster-relevant object labels we care about (window, door, shelf, bathtub…)
 * instead of being limited to COCO's 80 fixed classes.
 * Set EXPO_PUBLIC_HF_TOKEN to enable.
 */

import * as FileSystem from 'expo-file-system';
import type { DetectionResult, Detection, DetectionCategory } from '../types';

const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN ?? '';
const HF_ENABLED = !!HF_TOKEN;
const OWL_MODEL = 'google/owlvit-base-patch32';

/**
 * Disaster-safety labels sent as text prompts to OWL-ViT.
 * These are the objects that matter for earthquake/flood/tornado/blast/fire/hazmat.
 */
const SAFETY_LABELS = [
  'window',
  'door',
  'staircase',
  'stairs',
  'shelf',
  'bookcase',
  'desk',
  'table',
  'chair',
  'couch',
  'sofa',
  'bed',
  'bathtub',
  'mirror',
  'electrical outlet',
  'electrical panel',
  'refrigerator',
  'closet',
  'fire extinguisher',
  'exit sign',
];

const LABEL_TO_CATEGORY: Record<string, DetectionCategory> = {
  window: 'structural',
  door: 'exits',
  staircase: 'exits',
  stairs: 'exits',
  shelf: 'structural',
  bookcase: 'structural',
  desk: 'furniture',
  table: 'furniture',
  chair: 'furniture',
  couch: 'furniture',
  sofa: 'furniture',
  bed: 'furniture',
  bathtub: 'furniture',
  mirror: 'structural',
  'electrical outlet': 'hazards',
  'electrical panel': 'hazards',
  refrigerator: 'utilities',
  closet: 'structural',
  'fire extinguisher': 'utilities',
  'exit sign': 'exits',
};

interface HFDetectionItem {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

function mapCategory(label: string): DetectionCategory {
  return LABEL_TO_CATEGORY[label.toLowerCase()] ?? 'furniture';
}

export function isHFDetectionAvailable(): boolean {
  return HF_ENABLED;
}

export async function detectWithHF(
  frameId: string,
  imageUri: string,
  imageWidth: number,
  imageHeight: number,
  timeoutMs = 20000
): Promise<DetectionResult | null> {
  if (!HF_ENABLED) return null;

  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${OWL_MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // OWL-ViT zero-shot-object-detection: text is array-of-arrays (one array per image)
      body: JSON.stringify({
        inputs: {
          images: base64,
          text: [SAFETY_LABELS],
        },
        parameters: { threshold: 0.15 },
      }),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) return null;

    const raw = await res.json();
    // OWL-ViT returns [[items…]] (nested) or [items…] (flat) depending on version
    const data: HFDetectionItem[] = Array.isArray(raw)
      ? Array.isArray(raw[0])
        ? (raw[0] as HFDetectionItem[])
        : (raw as HFDetectionItem[])
      : [];

    if (!data.length) return null;

    const detections: Detection[] = data
      .filter((item) => (item.score ?? 0) > 0.1)
      .slice(0, 25)
      .map((item, i) => ({
        id: i + 1,
        label: (item.label ?? 'object').toLowerCase(),
        category: mapCategory(item.label ?? ''),
        bbox: {
          x1: Math.max(0, Math.min(1, item.box.xmin / imageWidth)),
          y1: Math.max(0, Math.min(1, item.box.ymin / imageHeight)),
          x2: Math.max(0, Math.min(1, item.box.xmax / imageWidth)),
          y2: Math.max(0, Math.min(1, item.box.ymax / imageHeight)),
        },
        confidence: item.score ?? 0,
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
        has_exterior_wall: detections.some((d) => d.label === 'window'),
        window_coverage_percent: null,
      },
    };
  } catch {
    clearTimeout(id);
    return null;
  }
}
