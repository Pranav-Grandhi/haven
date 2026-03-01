/**
 * AI safety classifier — Claude Haiku (claude-haiku-4-5).
 *
 * This is the SECOND stage of the pipeline, intentionally separate from detection:
 *
 *   [YOLO / CoreML / OWL-ViT]  →  DetectionResult (labels + bboxes)
 *              ↓
 *   [Claude Haiku — this file] →  SafetyAnalysis  (safe / danger / exit zones
 *                                                   + actions + voice summary)
 *
 * Why separate detection from classification:
 *  - YOLO is great at "what is this thing and where" — it's a vision model
 *  - Reasoning about whether a bookcase is safe in an earthquake vs. a flood
 *    is a language/reasoning task, not a vision task
 *  - Claude Haiku is fast (~400ms), cheap, and very capable for structured
 *    text reasoning — far better than keyword rules
 *  - Swapping the detection model (e.g. fine-tuning YOLO) doesn't affect the
 *    classifier, and vice versa
 *
 * Falls back to ruleBasedSafety if EXPO_PUBLIC_ANTHROPIC_KEY is not set
 * or if the API call fails.
 */

import type {
  DisasterMode,
  SafetyAnalysis,
  SafetyZone,
  ExitRoute,
  SafetyAction,
  DetectionResult,
  Detection,
} from '../types';
import { ruleBasedSafety } from './ruleBasedSafety';

const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
// Haiku: fastest Claude model, text-only — perfect for structured classification
const HAIKU = 'claude-haiku-4-5-20251001';

// ─── Per-mode context injected into every prompt ──────────────────────────────
const MODE_GUIDE: Record<DisasterMode, string> = {
  earthquake: `DROP, COVER, HOLD ON.
DANGER: windows and glass (shatter → shrapnel), mirrors, shelves/bookcases (tip and crush), hanging lights or art (fall), refrigerators/tall appliances (slide).
SAFE to shelter under/beside: sturdy solid-wood or metal desk, heavy dining table, sofa or couch (beside it, not under), bed frame (get under), interior wall (no windows nearby).
EXIT: doorway (frame may hold), hallway, staircase — move only when shaking stops.`,

  flood: `GET HIGHER NOW.
DANGER: electrical outlets, breaker panels (electrocution when wet), anything at or below ground level.
SAFE: staircases (move up), upper-floor furniture, roof access if extreme.
EXIT: staircase — never elevator; move to upper floor before water rises.`,

  tornado: `GET TO LOWEST INTERIOR POINT.
DANGER: all windows (pressure implosion + flying debris), exterior walls, garage doors, large open rooms.
SAFE: cast-iron or steel bathtub in an interior bathroom (get in, cover with mattress), interior closet with no exterior walls, interior hallway on lowest floor.
EXIT: interior door to bathroom or closet — close it behind you.`,

  blast: `GET BELOW WINDOW LINE, BEHIND SOLID COVER.
DANGER: every window and glass surface (shrapnel), mirrors, exterior walls facing blast.
SAFE: solid interior wall, heavy desk or table (get under), upholstered couch or sofa (crouch behind — fabric absorbs fragments), concrete column.
EXIT: interior door away from windows — stay low.`,

  fire: `GET OUT — STAY LOW WHERE AIR IS CLEANER.
DANGER: rooms with only one exit, smoke-filled corridors.
SAFE: any clear path toward an exit; close doors behind you to slow fire.
EXIT: door (feel for heat before opening), staircase (never elevator), exit sign, window as absolute last resort.`,

  hazmat: `SHELTER IN PLACE — SEAL THE ROOM.
DANGER: air vents, HVAC grilles, windows that don't seal tightly, electrical outlet gaps.
SAFE: interior room with fewest openings — bathroom is ideal (seal door gap with wet towels, seal vents with tape).
EXIT: only if ordered to evacuate; use sealed interior doors to limit exposure.`,

  hurricane: `SHELTER AWAY FROM WINDOWS — INTERIOR LOWEST FLOOR.
DANGER: windows (flying debris + pressure), glass doors, garage doors (blow in easily), exterior walls.
SAFE: interior bathroom or closet on the lowest floor (no exterior walls), bathtub (extra mass), hallway center.
EXIT: interior door to a small room — close it. Do not go outside until storm has fully passed.`,

  nuclear: `SHELTER IN PLACE — GET INSIDE, STAY INSIDE, STAY TUNED.
DANGER: windows and doors to outside (fallout entry), roof or top floors (highest radiation), outdoor air.
SAFE: basement or center of a multi-story building (concrete/brick walls absorb radiation best), interior room on middle floors.
EXIT: do not go outside unless directed by authorities. Seal all gaps if sheltering in place.`,

  lockdown: `HIDE — SILENCE — BARRICADE.
DANGER: windows visible from outside (duck below sill), doors without locks, open hallways, any area with no cover.
SAFE: locked interior room with solid door (barricade with furniture), low to the floor behind heavy furniture.
EXIT: only if you can reach an exit without being seen — stay low, run in a zigzag if outside.`,

  winter: `STAY WARM — CONSERVE HEAT — AVOID FROSTBITE.
DANGER: exterior doors and windows (heat loss), wet clothing, unventilated rooms with improvised heaters (CO poisoning), going outside unnecessarily.
SAFE: interior rooms away from exterior walls, under multiple layers of blankets, near a safe heat source.
EXIT: if pipes burst or structural damage, move to an interior room or seek a warming shelter.`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Describe a detection's position in plain English for the prompt. */
function describePosition(d: Detection): string {
  const cx = ((d.bbox.x1 + d.bbox.x2) / 2 * 100).toFixed(0);
  const cy = ((d.bbox.y1 + d.bbox.y2) / 2 * 100).toFixed(0);
  const side = Number(cx) < 40 ? 'left side' : Number(cx) > 60 ? 'right side' : 'center';
  const depth = Number(cy) < 40 ? 'upper area' : Number(cy) > 60 ? 'lower area' : 'mid area';
  return `${side}, ${depth} of frame`;
}

/** Find the detection whose label best matches a classifier label. */
function matchDetection(classifierLabel: string, detections: Detection[]): Detection | undefined {
  const cl = classifierLabel.toLowerCase().trim();
  return (
    detections.find((d) => d.label === cl) ??
    detections.find((d) => d.label.includes(cl) || cl.includes(d.label))
  );
}

// ─── Response types ───────────────────────────────────────────────────────────

interface HaikuZone {
  label: string;
  type: 'safe' | 'danger' | 'exit';
  action: string;
  reasoning: string;
}

interface HaikuResponse {
  zones: HaikuZone[];
  overall_score: number;   // 0–100
  primary_action: string;
  voice_summary: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Classify detected objects as safe / danger / exit using Claude Haiku.
 * Returns a full SafetyAnalysis ready for the UI.
 */
export async function classifySafety(
  frameId: string,
  mode: DisasterMode,
  detection: DetectionResult
): Promise<SafetyAnalysis> {
  // No key or nothing detected → rule-based fallback
  if (!ANTHROPIC_KEY || !detection.detections.length) {
    return ruleBasedSafety(frameId, mode, detection);
  }

  // Build a concise object list for the prompt
  const objectList = detection.detections
    .map((d) => `• ${d.label} — ${describePosition(d)} (confidence ${(d.confidence * 100).toFixed(0)}%)`)
    .join('\n');

  const prompt = `You are a certified disaster-safety instructor. The emergency type is: ${mode.toUpperCase()}

${MODE_GUIDE[mode]}

Objects detected in this room:
${objectList}

For each object, decide:
  "safe"   → good shelter (get under, beside, or inside it)
  "danger" → hazardous for this emergency (avoid / move away)
  "exit"   → use to escape or reach a safer area

Consider the object's position — e.g. a desk directly next to a window is riskier than one in the room center.
If an object is irrelevant to this emergency, omit it.

Return ONLY valid JSON — no markdown fences, no text outside the object:
{
  "zones": [
    {
      "label": "exact label from the detected objects list",
      "type": "safe | danger | exit",
      "action": "imperative instruction (≤10 words)",
      "reasoning": "one sentence explaining why, specific to ${mode}"
    }
  ],
  "overall_score": <integer 0–100, higher = safer room>,
  "primary_action": "single most important thing the user must do right now (≤15 words)",
  "voice_summary": "2 sentences max, calm and directive, spoken aloud to the user"
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: HAIKU,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return ruleBasedSafety(frameId, mode, detection);

    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? '';

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return ruleBasedSafety(frameId, mode, detection);

    let parsed: HaikuResponse;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return ruleBasedSafety(frameId, mode, detection);
    }

    if (!Array.isArray(parsed?.zones) || !parsed.zones.length) {
      return ruleBasedSafety(frameId, mode, detection);
    }

    // ── Map Haiku zones back to our types, attaching original bboxes ──────────
    let safeCount = 0;
    const zones: SafetyZone[] = parsed.zones
      .filter((z) => ['safe', 'danger', 'exit'].includes(z?.type))
      .map((z, i): SafetyZone => {
        const det = matchDetection(z.label, detection.detections);
        const isSafe = z.type === 'safe';
        if (isSafe) safeCount++;
        return {
          id: `zone_${z.type}_${i}`,
          type: z.type as SafetyZone['type'],
          // Lower number = higher priority; safe zones sorted by order Haiku returned them
          priority: isSafe ? safeCount : z.type === 'exit' ? 10 + i : 20 + i,
          bbox: det?.bbox ?? { x1: 0.05, y1: 0.05, x2: 0.95, y2: 0.95 },
          label: z.type === 'safe' ? 'SAFE' : z.type === 'exit' ? 'EXIT' : 'DANGER',
          short_description: z.label,
          detailed_reasoning: z.reasoning,
          references_detections: det ? [det.id] : [],
          action: z.action,
        };
      });

    const exitZones = parsed.zones.filter((z) => z.type === 'exit');
    const exit_routes: ExitRoute[] = exitZones.slice(0, 3).map((z, i): ExitRoute => {
      const det = matchDetection(z.label, detection.detections);
      return {
        id: `exit_${i}`,
        priority: i + 1,
        path_description: z.label.charAt(0).toUpperCase() + z.label.slice(1),
        bbox: det?.bbox ?? { x1: 0, y1: 0.2, x2: 0.25, y2: 0.9 },
        is_blocked: false,
        notes: z.action,
      };
    });

    const dangerCount = zones.filter((z) => z.type === 'danger').length;
    const score = Math.max(0, Math.min(100, Math.round(parsed.overall_score ?? 50)));

    const actions: SafetyAction[] = [
      {
        priority: 1,
        instruction: parsed.primary_action ?? 'Move to the safest area immediately.',
        direction: null,
        urgency: 'immediate',
      },
      {
        priority: 2,
        instruction: `${safeCount} safe area${safeCount !== 1 ? 's' : ''} and ${dangerCount} hazard${dangerCount !== 1 ? 's' : ''} identified. Safety score: ${score}/100.`,
        direction: null,
        urgency: 'recommended',
      },
    ];

    if (exit_routes.length > 0) {
      actions.push({
        priority: 3,
        instruction: `Nearest exit: ${exit_routes[0].path_description}. ${exit_routes[0].notes ?? ''}`,
        direction: null,
        urgency: 'recommended',
      });
    }

    return {
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
    };
  } catch {
    return ruleBasedSafety(frameId, mode, detection);
  }
}
