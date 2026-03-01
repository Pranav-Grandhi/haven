import type { BoundingBox } from '../types';

/**
 * Intersection over Union for zone matching.
 */
export function iou(box1: BoundingBox, box2: BoundingBox): number {
  const intersection_x1 = Math.max(box1.x1, box2.x1);
  const intersection_y1 = Math.max(box1.y1, box2.y1);
  const intersection_x2 = Math.min(box1.x2, box2.x2);
  const intersection_y2 = Math.min(box1.y2, box2.y2);

  const intersection_area =
    Math.max(0, intersection_x2 - intersection_x1) *
    Math.max(0, intersection_y2 - intersection_y1);
  const box1_area = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
  const box2_area = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);
  const union_area = box1_area + box2_area - intersection_area;

  return union_area > 0 ? intersection_area / union_area : 0;
}

/**
 * Smooth bbox: α * new + (1 - α) * previous.
 */
export function smoothBbox(
  newBox: BoundingBox,
  previousBox: BoundingBox,
  alpha: number = 0.3
): BoundingBox {
  return {
    x1: alpha * newBox.x1 + (1 - alpha) * previousBox.x1,
    y1: alpha * newBox.y1 + (1 - alpha) * previousBox.y1,
    x2: alpha * newBox.x2 + (1 - alpha) * previousBox.x2,
    y2: alpha * newBox.y2 + (1 - alpha) * previousBox.y2,
  };
}

/**
 * Convert normalized bbox (0-1) to pixel coordinates.
 */
export function bboxToPixels(
  bbox: BoundingBox,
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } {
  return {
    left: bbox.x1 * width,
    top: bbox.y1 * height,
    width: (bbox.x2 - bbox.x1) * width,
    height: (bbox.y2 - bbox.y1) * height,
  };
}
