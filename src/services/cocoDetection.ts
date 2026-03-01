/**
 * Stub for native (iOS/Android). COCO-SSD runs only on web; see cocoDetection.web.ts.
 * No TensorFlow imports so Metro can bundle for iOS without resolving browser-only packages.
 */

import type { DetectionResult } from '../types';

export async function detectFromImageUrl(
  _frameId: string,
  _imageUrl: string,
  _imageWidth: number,
  _imageHeight: number
): Promise<DetectionResult | null> {
  return null;
}

export function isCocoAvailable(): boolean {
  return false;
}
