/**
 * Object detection via Claude Vision (claude-sonnet-4-6).
 *
 * Why Claude and not COCO/DETR/OWL-ViT:
 *  - COCO-80 models cannot detect window, door, shelf, bookcase, mirror, bathtub,
 *    closet, staircase — the structural objects that matter most in a disaster.
 *  - OWL-ViT is zero-shot and approximate.
 *  - Claude Vision is natively trained on these objects AND understands disaster
 *    context, so it classifies each object correctly for the active mode
 *    (e.g. window = danger in earthquake, stairs = exit in flood).
 *
 * Set EXPO_PUBLIC_ANTHROPIC_KEY to enable. Falls back to other detectors if unset.
 */

import * as FileSystem from 'expo-file-system';
import type { DetectionResult, Detection, DetectionCategory, DisasterMode } from '../types';

const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

/** Disaster-specific context injected into the prompt so Claude classifies correctly. */
const MODE_CONTEXT: Record<DisasterMode, string> = {
  earthquake: `EARTHQUAKE — what matters:
  DANGER: windows (glass shatters), shelves/bookcases (topple), mirrors (shatter), hanging lights or art (fall), refrigerator (slides/tips), electrical panels.
  SAFE (hide under/beside): sturdy desk, solid table, sofa, bed frame, interior wall (no windows).
  EXIT: door, staircase, hallway.`,

  flood: `FLOOD — what matters:
  DANGER: electrical outlets, electrical panel, anything at ground/floor level.
  SAFE: staircase (go up), upper furniture, high shelving.
  EXIT: staircase (go to highest floor), roof access if extreme.`,

  tornado: `TORNADO — what matters:
  DANGER: all windows (implosion), exterior walls, garage door, large open rooms.
  SAFE: bathtub in interior bathroom, interior closet, hallway with no windows.
  EXIT: interior door to bathroom or closet.`,

  blast: `BLAST/EXPLOSION — what matters:
  DANGER: all windows and glass (shrapnel), mirrors, exterior walls.
  SAFE: interior walls, sturdy desk or table (get under), sofa or couch (crouch behind), concrete column.
  EXIT: interior door away from blast direction.`,

  fire: `FIRE — what matters:
  DANGER: blocked doorways, rooms with only one exit.
  SAFE: path to a clear exit, stairs (never elevator).
  EXIT: door, staircase, exit sign, window as last resort.`,

  hazmat: `HAZMAT — what matters:
  DANGER: air vents, HVAC grilles, windows that do not seal tightly.
  SAFE: sealed interior room, bathroom (seal door gap with wet towel), closet.
  EXIT: sealed interior door (shelter-in-place preferred).`,
};

interface ClaudeObject {
  label: string;
  type: 'safe' | 'danger' | 'exit';
  reasoning: string;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

function toCategory(type: string, label: string): DetectionCategory {
  if (type === 'exit') return 'exits';
  if (type === 'danger') {
    if (['window', 'shelf', 'bookcase', 'mirror', 'panel'].some((k) => label.includes(k))) return 'structural';
    return 'hazards';
  }
  if (['wall', 'window', 'door', 'shelf', 'bookcase', 'stair'].some((k) => label.includes(k))) return 'structural';
  return 'furniture';
}

export function isClaudeDetectionAvailable(): boolean {
  return !!ANTHROPIC_KEY;
}

export async function detectWithClaude(
  frameId: string,
  imageUri: string,
  imageWidth: number,
  imageHeight: number,
  mode: DisasterMode,
  timeoutMs = 25000
): Promise<DetectionResult | null> {
  if (!ANTHROPIC_KEY) return null;

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

  const prompt = `You are a disaster safety expert scanning a room during an emergency.

${MODE_CONTEXT[mode]}

Look at this photo. For every visible object relevant to survival, output:
- label: the object name (e.g. "window", "desk", "bookcase", "staircase")
- type: exactly one of "safe", "danger", or "exit"
- reasoning: one short sentence explaining why (specific to this disaster)
- bbox: normalized bounding box {x1, y1, x2, y2} where 0.0 = top/left edge, 1.0 = bottom/right edge

Objects to look for: window, door, staircase, stairs, shelf, bookcase, desk, table, chair, sofa, couch, bed, bathtub, mirror, electrical outlet, electrical panel, refrigerator, closet, hanging light, wall, column, exit sign.

Return ONLY a valid JSON array — no markdown fences, no explanation outside the array:
[{"label":"desk","type":"safe","reasoning":"sturdy surface to shelter under during shaking","bbox":{"x1":0.1,"y1":0.5,"x2":0.45,"y2":0.9}}]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) return null;

    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? '';

    // Pull the JSON array out of the response (handles any stray whitespace)
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;

    let objects: ClaudeObject[];
    try {
      objects = JSON.parse(match[0]);
    } catch {
      return null;
    }
    if (!Array.isArray(objects) || !objects.length) return null;

    const detections: Detection[] = objects
      .filter((o) => o?.label && o?.bbox && ['safe', 'danger', 'exit'].includes(o.type))
      .slice(0, 25)
      .map((o, i) => ({
        id: i + 1,
        label: o.label.toLowerCase().trim(),
        category: toCategory(o.type, o.label.toLowerCase()),
        bbox: {
          x1: Math.max(0, Math.min(1, Number(o.bbox.x1) || 0)),
          y1: Math.max(0, Math.min(1, Number(o.bbox.y1) || 0)),
          x2: Math.max(0, Math.min(1, Number(o.bbox.x2) || 1)),
          y2: Math.max(0, Math.min(1, Number(o.bbox.y2) || 1)),
        },
        confidence: 0.92,
        attributes: {
          estimated_height_m: null,
          anchored_to_wall: null,
          material: null,
          is_structural: null,
        },
      }));

    if (!detections.length) return null;

    return {
      frame_id: frameId,
      timestamp: Date.now() / 1000,
      image_dimensions: { width: imageWidth, height: imageHeight },
      detections,
      scene_analysis: {
        room_type: 'indoor',
        estimated_floor_level: 1,
        has_exterior_wall: detections.some((d) => d.label.includes('window')),
        window_coverage_percent: null,
      },
    };
  } catch {
    clearTimeout(id);
    return null;
  }
}
