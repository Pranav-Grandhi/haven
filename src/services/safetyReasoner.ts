import type { DisasterMode, SafetyAnalysis, DetectionResult } from '../types';
import { SAFETY_SYSTEM_PROMPT, buildSafetyUserPrompt } from '../constants/prompts';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const USE_MOCK = !OPENAI_API_KEY;

/**
 * Mock safety analysis for dev when no API key.
 */
function mockSafetyAnalysis(
  frameId: string,
  mode: DisasterMode,
  _detection: DetectionResult
): SafetyAnalysis {
  return {
    frame_id: frameId,
    mode,
    analysis_timestamp: new Date().toISOString(),
    safety_score: {
      overall: 68,
      structural: 75,
      egress: 80,
      hazard_exposure: 45,
    },
    zones: [
      {
        id: 'zone_001',
        type: 'safe',
        priority: 1,
        bbox: { x1: 0.1, y1: 0.5, x2: 0.3, y2: 0.9 },
        label: 'BEST COVER',
        short_description: 'Interior load-bearing wall',
        detailed_reasoning:
          'This interior wall provides structural protection during seismic activity. Getting low against this wall reduces injury risk from falling debris.',
        references_detections: [3],
        action: 'Move here and get low',
      },
      {
        id: 'zone_002',
        type: 'danger',
        priority: 1,
        bbox: { x1: 0.6, y1: 0.1, x2: 0.9, y2: 0.6 },
        label: 'DANGER',
        short_description: 'Floor-to-ceiling window',
        detailed_reasoning:
          'Large glass surface poses severe laceration risk during shaking. Stay at least 6 feet away.',
        references_detections: [2],
        action: 'Stay away',
      },
    ],
    exit_routes: [
      {
        id: 'exit_001',
        priority: 1,
        path_description: 'Door to hallway, 10 feet ahead',
        bbox: { x1: 0.4, y1: 0.3, x2: 0.5, y2: 0.8 },
        is_blocked: false,
        notes: 'Use after shaking stops',
      },
    ],
    actions: [
      {
        priority: 1,
        instruction: 'Move to the interior wall on your left',
        direction: 'left',
        urgency: 'immediate',
      },
      {
        priority: 2,
        instruction: 'Get low and cover your head',
        direction: null,
        urgency: 'immediate',
      },
    ],
    voice_response:
      'Move to the interior wall on your left and get low. Stay away from the large window. Safety score: 68 out of 100.',
    risks_summary: {
      total_count: 4,
      critical_count: 2,
      descriptions: [
        'Large window with high shatter risk',
        'Unsecured bookshelf may topple',
      ],
    },
  };
}

export interface ReasonOptions {
  frameId: string;
  mode: DisasterMode;
  detection: DetectionResult;
  threatContext?: string;
  timeoutMs?: number;
}

/**
 * Call GPT-4o for safety analysis. Uses mock when no API key.
 */
export async function reasonSafety(options: ReasonOptions): Promise<SafetyAnalysis> {
  const { frameId, mode, detection, threatContext = '', timeoutMs = 15000 } = options;

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockSafetyAnalysis(frameId, mode, detection);
  }

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

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SAFETY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.3,
    }),
    signal: controller.signal,
  });
  clearTimeout(id);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? res.statusText);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from GPT-4o');

  const parsed = JSON.parse(content) as SafetyAnalysis;
  parsed.frame_id = frameId;
  parsed.mode = mode;
  parsed.analysis_timestamp = new Date().toISOString();
  return parsed;
}
