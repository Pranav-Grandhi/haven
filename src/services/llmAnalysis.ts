/**
 * Direct LLM room analysis — no intermediate detection pipeline.
 *
 * Problem with the old approach:
 *   detect objects (labels) → classify labels → overlay on photo
 *   If the detector calls a wall "desk" or a door "mirror", that wrong
 *   label propagates all the way to the overlay. Garbage in, garbage out.
 *
 * This approach:
 *   actual photos → OpenAI Vision (GPT-4o) → safe / danger / exit zones + bboxes
 *   The model sees what is actually there and classifies it directly.
 *   No intermediate labels. No mismatch possible.
 *
 * Multiple frames from the 360° sweep are sent in one API call so the model
 * has full-room context, not just a single angle. Bboxes in the response
 * are anchored to the representative frame (Photo 1) so they line up with
 * the result photo shown to the user.
 */

import {
  readAsStringAsync,
  copyAsync,
  cacheDirectory,
  EncodingType,
} from 'expo-file-system/legacy';
import type {
  DisasterMode,
  SafetyAnalysis,
  SafetyZone,
  ExitRoute,
  SafetyAction,
} from '../types';
import type { ScanFrame } from '../hooks/use360Scan';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const MODEL = 'gpt-4o';

/** How many frames to send (evenly distributed across the sweep). */
const KEY_FRAME_COUNT = 4;

// ─── Per-mode safety guide injected into every prompt ─────────────────────────
const MODE_GUIDE: Record<DisasterMode, string> = {
  earthquake: `DROP, COVER, HOLD ON.
SAFE (shelter here): sturdy solid desks or tables (get under), heavy sofas (crouch beside), bed frames (get under), interior walls with no windows.
DANGER (avoid): all windows and glass (shatter → shrapnel), mirrors, tall unsecured shelves or bookcases (tip and crush), hanging lights or ceiling fans (fall), refrigerators and heavy appliances (slide).
EXIT: doorways, hallways, staircases — move only once shaking stops.`,

  flood: `GET TO HIGHER GROUND IMMEDIATELY.
SAFE: staircases (go up now), upper-floor areas, roof access if extreme.
DANGER: electrical outlets, breaker/fuse panels (electrocution when wet), any area at or below ground level.
EXIT: staircase — never elevator. Move upward before water rises.`,

  tornado: `GET TO THE LOWEST INTERIOR POINT.
SAFE: bathtub inside an interior bathroom (no exterior walls — get in, pull mattress over you), interior closets, interior hallways on the lowest floor.
DANGER: every window (pressure implosion + debris), exterior walls, garage doors, large open rooms.
EXIT: interior door leading to a bathroom, closet, or hallway — close it behind you.`,

  blast: `GET BELOW THE WINDOW LINE BEHIND SOLID COVER.
SAFE: solid interior walls (put one between you and the windows), heavy desks or tables (get under), upholstered sofas (crouch behind — fabric slows fragments), concrete columns.
DANGER: every window and glass surface (become projectiles), mirrors, exterior walls.
EXIT: interior door away from the direction of the blast — stay low.`,

  fire: `GET OUT NOW — STAY LOW WHERE AIR IS CLEANER.
SAFE: any clear path toward an exit; close doors behind you to slow fire spread.
DANGER: rooms with only one exit, smoke-filled corridors, any blocked doorway.
EXIT: door (check for heat first), staircase (never elevator), exit sign, window only as absolute last resort.`,

  hazmat: `SHELTER IN PLACE — SEAL THE ROOM.
SAFE: interior room with the fewest openings — a bathroom is ideal (seal door gap with wet towels, cover vents).
DANGER: air vents and HVAC grilles, windows that do not seal tightly, electrical outlet gaps (air paths).
EXIT: only if ordered to evacuate; use sealed interior doors to limit exposure while moving.`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pick N evenly-distributed frames from the sweep.
 * The first returned frame becomes the result photo (Photo 1 in the prompt).
 */
function selectKeyFrames(frames: ScanFrame[], n: number): ScanFrame[] {
  if (frames.length <= n) return [...frames];
  // Start from the middle of the sweep so Photo 1 is the most representative view
  const mid = Math.floor(frames.length / 2);
  const indices = Array.from({ length: n }, (_, i) => {
    const offset = Math.round((i / (n - 1)) * (frames.length - 1));
    return offset;
  });
  // Make the mid-frame be first (it becomes the result photo)
  const sorted = [...new Set([mid, ...indices])].slice(0, n);
  return sorted.map((i) => frames[i]);
}

/**
 * Get base64 image data from a frame: use frame.base64 if present (from takePictureAsync({ base64: true })),
 * otherwise read from uri. Handles data URLs and file URIs; copies to cache if direct read fails (e.g. Expo Go).
 */
async function getFrameBase64(frame: ScanFrame): Promise<string | null> {
  if (frame.base64 && frame.base64.length > 0) return frame.base64;
  const uri = frame.uri;
  // Data URL (e.g. from web camera): extract base64 part
  if (uri.startsWith('data:image/')) {
    const comma = uri.indexOf(',');
    if (comma !== -1) return uri.slice(comma + 1).trim();
    return null;
  }
  try {
    return await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
  } catch {
    // Copy to app cache then read (helps when uri is in a directory Expo Go can't read)
    if (!cacheDirectory) return null;
    try {
      const filename = `frame_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const dest = `${cacheDirectory}${filename}`;
      await copyAsync({ from: uri, to: dest });
      return await readAsStringAsync(dest, {
        encoding: EncodingType.Base64,
      });
    } catch {
      return null;
    }
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

interface LLMZone {
  label: string;
  type: 'safe' | 'danger' | 'exit';
  reasoning: string;
  action: string;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

interface LLMResponse {
  zones: LLMZone[];
  overall_score: number;
  primary_action: string;
  voice_summary: string;
  /** True when the best course of action is to evacuate and go to a safe shelter outside (e.g. fire, flood). */
  recommend_evacuate?: boolean;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type LLMAnalysisResult =
  | { ok: true; analysis: SafetyAnalysis; resultPhotoUri: string }
  | { ok: false; error: string };

/**
 * Send captured frames directly to Claude Vision and get a full SafetyAnalysis back.
 *
 * @param allFrames  All frames from the 360° sweep.
 * @param mode       Active disaster mode.
 * @returns Result with analysis on success, or { ok: false, error } with a specific message.
 */
export async function analyzeRoomWithLLM(
  allFrames: ScanFrame[],
  mode: DisasterMode
): Promise<LLMAnalysisResult> {
  if (!OPENAI_API_KEY || allFrames.length === 0) {
    return { ok: false, error: 'API key not set or no frames.' };
  }

  const keyFrames = selectKeyFrames(allFrames, Math.min(KEY_FRAME_COUNT, allFrames.length));
  const resultFrame = keyFrames[0]; // Photo 1 = result photo

  // Load all frames as base64 (use frame.base64 when set, else read from uri)
  const base64Results = await Promise.all(keyFrames.map((f) => getFrameBase64(f)));
  const validFrames = keyFrames.filter((_, i) => base64Results[i] !== null);
  const validBase64 = base64Results.filter((b): b is string => b !== null);

  if (validBase64.length === 0) {
    return { ok: false, error: 'Could not read captured photos.' };
  }

  // Build OpenAI message content: alternating image_url + text (vision API)
  const contentParts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
  validBase64.forEach((b64, i) => {
    contentParts.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${b64}` },
    });
    contentParts.push({
      type: 'text',
      text: i === 0
        ? `Photo 1 — MAIN VIEW (result photo, zones must be in this photo's coordinate space)`
        : `Photo ${i + 1} — additional angle (~${Math.round((i / (validFrames.length - 1 || 1)) * 360)}° into the sweep)`,
    });
  });

  const prompt = `You are a certified disaster-safety expert analyzing a 360° room scan.

${validBase64.length} photos were taken as the camera swept around the room during a ${mode.toUpperCase()} emergency. Together they show the complete space from all angles.

${MODE_GUIDE[mode]}

TASK: Look at all photos to understand the full room. Then identify the key safety zones in PHOTO 1 (the main result photo).

CRITICAL — You must name ONE clearest safest spot: the single best place to take cover (e.g. "under the wooden desk", "inside the bathroom tub", "against the interior wall beside the sofa"). Put the first safe zone in your "zones" array as that single best option (priority will be inferred from order). The user must see one unambiguous answer: "Safest: [place]."

For every significant feature visible in Photo 1, classify it:
• "safe"   → where to take cover (under / beside / inside); list the single best option first
• "danger" → hazardous, must avoid immediately
• "exit"   → use to escape or reach safety

Rules for bounding boxes (VERY IMPORTANT):
- Coordinates are for PHOTO 1 only, normalized 0.0–1.0
- (0.0, 0.0) = top-left corner of Photo 1
- (1.0, 1.0) = bottom-right corner of Photo 1
- Make boxes tight around the actual object, not the whole image
- If an object takes up the left third: x1≈0.0, x2≈0.33

Return ONLY valid JSON — absolutely no markdown, no text outside the object:
{
  "zones": [
    {
      "label": "describe what you actually see (e.g. 'wooden desk', 'large window', 'interior door')",
      "type": "safe | danger | exit",
      "reasoning": "one sentence, specific to ${mode}",
      "action": "imperative instruction, 8 words max",
      "bbox": { "x1": 0.0, "y1": 0.0, "x2": 1.0, "y2": 1.0 }
    }
  ],
  "overall_score": <integer 0–100, higher = safer room>,
  "primary_action": "ONE clear instruction: go to [the specific safest place you named]. Example: 'Get under the sturdy desk now.' 15 words max.",
  "voice_summary": "Start with the safest place: 'The safest place is [specific location]. [One more short instruction].' 2 short sentences.",
  "recommend_evacuate": <boolean: true ONLY when the best option is to leave the building and seek a safe shelter outside — e.g. fire (get out now), flood (get to higher ground outside), severe/immediate threat. false when sheltering in place is better (earthquake, tornado, blast, hazmat).>
}`;

  try {
    contentParts.push({ type: 'text', text: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
      }),
    });

    if (!res.ok) {
      let body = '';
      try {
        const errJson = await res.json();
        body = errJson?.error?.message ?? errJson?.message ?? JSON.stringify(errJson).slice(0, 120);
      } catch {
        body = await res.text().then((t) => t.slice(0, 120)).catch(() => '');
      }
      const msg = res.status === 401
        ? 'Invalid API key. Paste your OpenAI key in .env as EXPO_PUBLIC_OPENAI_API_KEY, then restart (npx expo start).'
        : res.status === 429
          ? 'Rate limited. Wait a moment and try again.'
          : `${res.status}: ${body || res.statusText}`;
      return { ok: false, error: msg };
    }

    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? '';

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { ok: false, error: 'API returned no valid analysis. Try again.' };
    }

    let parsed: LLMResponse;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { ok: false, error: 'Could not parse API response. Try again.' };
    }
    if (!Array.isArray(parsed?.zones) || parsed.zones.length === 0) {
      return { ok: false, error: 'API returned no safety zones. Try again.' };
    }

    // ── Build SafetyAnalysis from the LLM response ────────────────────────────
    let safeCount = 0;
    const zones: SafetyZone[] = parsed.zones
      .filter((z) => ['safe', 'danger', 'exit'].includes(z?.type))
      .map((z, i): SafetyZone => {
        if (z.type === 'safe') safeCount++;
        return {
          id: `zone_${z.type}_${i}`,
          type: z.type as SafetyZone['type'],
          priority: z.type === 'safe' ? safeCount : z.type === 'exit' ? 10 + i : 20 + i,
          bbox: {
            x1: Math.max(0, Math.min(1, Number(z.bbox?.x1) || 0)),
            y1: Math.max(0, Math.min(1, Number(z.bbox?.y1) || 0)),
            x2: Math.max(0, Math.min(1, Number(z.bbox?.x2) || 1)),
            y2: Math.max(0, Math.min(1, Number(z.bbox?.y2) || 1)),
          },
          label: z.type === 'safe' ? 'SAFE' : z.type === 'exit' ? 'EXIT' : 'DANGER',
          short_description: z.label ?? '',
          detailed_reasoning: z.reasoning ?? '',
          references_detections: [],
          action: z.action ?? '',
        };
      });

    const exitZones = parsed.zones.filter((z) => z.type === 'exit');
    const exit_routes: ExitRoute[] = exitZones.slice(0, 3).map((z, i): ExitRoute => ({
      id: `exit_${i}`,
      priority: i + 1,
      path_description: z.label ?? 'Exit',
      bbox: {
        x1: Math.max(0, Math.min(1, Number(z.bbox?.x1) || 0)),
        y1: Math.max(0, Math.min(1, Number(z.bbox?.y1) || 0)),
        x2: Math.max(0, Math.min(1, Number(z.bbox?.x2) || 0.3)),
        y2: Math.max(0, Math.min(1, Number(z.bbox?.y2) || 1)),
      },
      is_blocked: false,
      notes: z.action ?? null,
    }));

    const dangerCount = zones.filter((z) => z.type === 'danger').length;
    const score = Math.max(0, Math.min(100, Math.round(parsed.overall_score ?? 50)));

    const actions: SafetyAction[] = [
      {
        priority: 1,
        instruction: parsed.primary_action ?? 'Move to the safest marked area immediately.',
        direction: null,
        urgency: 'immediate',
      },
      {
        priority: 2,
        instruction: `${safeCount} safe area${safeCount !== 1 ? 's' : ''}, ${dangerCount} hazard${dangerCount !== 1 ? 's' : ''} identified. Safety score: ${score}/100.`,
        direction: null,
        urgency: 'recommended',
      },
      ...(exit_routes.length > 0
        ? [{
            priority: 3 as const,
            instruction: `Nearest exit: ${exit_routes[0].path_description}. ${exit_routes[0].notes ?? ''}`,
            direction: null as string | null,
            urgency: 'recommended' as const,
          }]
        : []),
    ];

    const frameId = resultFrame.frame_id;

    const analysis: SafetyAnalysis = {
      frame_id: frameId,
      mode,
      analysis_timestamp: new Date().toISOString(),
      safety_score: {
        overall: score,
        structural: score,
        egress: exit_routes.length > 0 ? 85 : 45,
        hazard_exposure: Math.max(0, 100 - dangerCount * 25),
      },
      zones,
      exit_routes,
      actions,
      voice_response: parsed.voice_summary ?? `${safeCount} safe areas and ${dangerCount} hazards found. Safety score: ${score} out of 100.`,
      risks_summary: {
        total_count: dangerCount,
        critical_count: dangerCount,
        descriptions: zones
          .filter((z) => z.type === 'danger')
          .map((z) => `${z.short_description}: ${z.detailed_reasoning}`),
      },
      recommend_evacuate: parsed.recommend_evacuate === true,
    };

    return { ok: true, analysis, resultPhotoUri: resultFrame.uri };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isNetwork =
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('Failed to fetch');
    return {
      ok: false,
      error: isNetwork
        ? 'Network error. Check your internet connection and try again.'
        : `Error: ${message.slice(0, 80)}`,
    };
  }
}
