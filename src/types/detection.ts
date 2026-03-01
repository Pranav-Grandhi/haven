/**
 * Object detection types (from detection API / Grounding DINO).
 */

export interface BoundingBox {
  x1: number; // 0-1 normalized, left edge
  y1: number; // 0-1 normalized, top edge
  x2: number; // 0-1 normalized, right edge
  y2: number; // 0-1 normalized, bottom edge
}

export type DetectionCategory =
  | 'furniture'
  | 'structural'
  | 'hazards'
  | 'exits'
  | 'elevation'
  | 'utilities';

export interface Detection {
  id: number;
  label: string;
  category: DetectionCategory;
  bbox: BoundingBox;
  confidence: number; // 0-1
  attributes: {
    estimated_height_m: number | null;
    anchored_to_wall: boolean | null;
    material: string | null;
    is_structural: boolean | null;
  };
}

export interface SceneAnalysis {
  room_type: string | null;
  estimated_floor_level: number | null;
  has_exterior_wall: boolean | null;
  window_coverage_percent: number | null;
}

export interface DetectionResult {
  frame_id: string;
  timestamp: number;
  image_dimensions: { width: number; height: number };
  detections: Detection[];
  scene_analysis: SceneAnalysis;
}
