/**
 * Local object detection via ONNX Runtime (e.g. YOLOv8).
 * Uses try/catch so the app still runs in Expo Go (no native ONNX) and falls back to cloud/mock.
 */

import type { DetectionResult } from '../types';

const MODEL_PATH_ENV = process.env.EXPO_PUBLIC_LOCAL_YOLO_PATH ?? '';

/**
 * Try to run local ONNX object detection. Returns null if:
 * - Running in Expo Go (native module not available)
 * - No model path configured
 * - Model load or inference fails
 */
export async function detectObjectsLocal(
  frameId: string,
  _imageBase64: string
): Promise<DetectionResult | null> {
  if (!MODEL_PATH_ENV) return null;

  try {
    const Ort = require('onnxruntime-react-native');
    const session = await Ort.InferenceSession.create(MODEL_PATH_ENV);
    // TODO: Decode base64 to image tensor (e.g. 1x3x640x640 for YOLOv8), run session.run(), 
    // post-process (NMS, scale boxes to 0-1), map to DetectionResult. For now we require
    // a real model and preprocessing to be implemented; returning null uses fallback.
    return null;
  } catch {
    return null;
  }
}
