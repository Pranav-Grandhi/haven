/**
 * Local safety reasoning via llama.rn (GGUF model).
 * Uses try/catch so the app still runs in Expo Go (no native llama.cpp) and falls back to GPT-4o/mock.
 */

import type { DisasterMode, SafetyAnalysis, DetectionResult } from '../types';
import { SAFETY_SYSTEM_PROMPT, buildSafetyUserPrompt } from '../constants/prompts';

const MODEL_PATH_ENV = process.env.EXPO_PUBLIC_LOCAL_LLM_PATH ?? '';
const DEFAULT_MODEL_FILENAME = 'safety_model.gguf';

let cachedContext: { completion: (p: { prompt: string; n_predict?: number; response_format?: object }) => Promise<{ text: string }> } | null = null;

async function getLocalModelPath(): Promise<string | null> {
  if (MODEL_PATH_ENV) return MODEL_PATH_ENV;
  try {
    const FileSystem = require('expo-file-system');
    const dir = FileSystem.documentDirectory;
    if (!dir) return null;
    const path = `${dir}${DEFAULT_MODEL_FILENAME}`;
    const info = await FileSystem.getInfoAsync(path, { size: false });
    return info.exists ? path : null;
  } catch {
    return null;
  }
}

async function getLocalContext(): Promise<typeof cachedContext> {
  if (cachedContext) return cachedContext;
  const modelPath = await getLocalModelPath();
  if (!modelPath) return null;

  try {
    const { initLlama } = require('llama.rn');
    const path = modelPath.startsWith('file://') ? modelPath : `file://${modelPath}`;
    const ctx = await initLlama({
      model: path,
      n_ctx: 4096,
      n_gpu_layers: -1,
    });
    cachedContext = {
      completion: (params: { prompt: string; n_predict?: number; response_format?: object }) =>
        ctx.completion({
          prompt: params.prompt,
          n_predict: params.n_predict ?? 1024,
          response_format: params.response_format ?? { type: 'json_object' },
        }),
    };
    return cachedContext;
  } catch {
    return null;
  }
}

/**
 * Try to run local LLM safety analysis. Returns null if:
 * - Running in Expo Go (native module not available)
 * - No model path configured or model load fails
 * - Completion or JSON parse fails
 */
export async function reasonSafetyLocal(options: {
  frameId: string;
  mode: DisasterMode;
  detection: DetectionResult;
  threatContext?: string;
}): Promise<SafetyAnalysis | null> {
  const { frameId, mode, detection, threatContext = '' } = options;
  const ctx = await getLocalContext();
  if (!ctx) return null;

  const scene = detection.scene_analysis;
  const userPrompt = buildSafetyUserPrompt({
    mode,
    threatContext,
    detectionResultsJson: JSON.stringify(detection, null, 2),
    roomType: scene.room_type,
    floorLevel: scene.estimated_floor_level,
    hasExterior: scene.has_exterior_wall,
    windowPercent: scene.window_coverage_percent,
  });

  const fullPrompt = `${SAFETY_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}\n\nRespond with only valid JSON, no markdown:`;

  try {
    const result = await ctx.completion({
      prompt: fullPrompt,
      n_predict: 1024,
      response_format: { type: 'json_object' },
    });
    const text = typeof result?.text === 'string' ? result.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as SafetyAnalysis;
    parsed.frame_id = frameId;
    parsed.mode = mode;
    parsed.analysis_timestamp = new Date().toISOString();
    return parsed;
  } catch {
    return null;
  }
}
