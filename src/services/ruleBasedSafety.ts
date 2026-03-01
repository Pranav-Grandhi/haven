/**
 * Rule-based safety analysis from detections (no GPT).
 * Uses disaster-mode logic from the spec to mark safe/danger zones.
 */

import type {
  DisasterMode,
  SafetyAnalysis,
  SafetyZone,
  ExitRoute,
  SafetyAction,
  DetectionResult,
} from '../types';

const DANGER_LABELS: Record<DisasterMode, string[]> = {
  earthquake: ['window', 'glass', 'mirror', 'hanging', 'shelf', 'bookcase', 'exterior'],
  flood: ['basement', 'floor', 'electrical', 'outlet', 'ground'],
  tornado: ['window', 'exterior', 'garage', 'top floor', 'open room'],
  blast: ['window', 'glass', 'exterior', 'mirror'],
  fire: ['single exit', 'blocked', 'interior room'],
  hazmat: ['vent', 'hvac', 'window', 'intake'],
};

const SAFE_LABELS: Record<DisasterMode, string[]> = {
  earthquake: ['wall', 'interior', 'door frame', 'doorframe', 'sturdy', 'desk', 'table', 'chair'],
  flood: ['upper', 'floor', 'roof', 'stair', 'high'],
  tornado: ['basement', 'bathroom', 'closet', 'interior', 'hallway'],
  blast: ['interior', 'wall', 'column', 'behind', 'desk', 'table'],
  fire: ['exit', 'door', 'egress', 'stair'],
  hazmat: ['interior', 'bathroom', 'seal', 'room'],
};

function labelMatches(detectionLabel: string, keywords: string[]): boolean {
  const lower = detectionLabel.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function ruleBasedSafety(
  frameId: string,
  mode: DisasterMode,
  detection: DetectionResult
): SafetyAnalysis {
  const zones: SafetyZone[] = [];
  const dangerKeywords = DANGER_LABELS[mode];
  const safeKeywords = SAFE_LABELS[mode];
  const riskDescriptions: string[] = [];
  let safeCount = 0;
  let dangerCount = 0;

  detection.detections.forEach((d, i) => {
    const isDanger = labelMatches(d.label, dangerKeywords);
    const isSafe = labelMatches(d.label, safeKeywords);

    if (isDanger && d.confidence > 0.3) {
      dangerCount++;
      riskDescriptions.push(`${d.label} (${(d.confidence * 100).toFixed(0)}% confidence)`);
      zones.push({
        id: `zone_danger_${i}`,
        type: 'danger',
        priority: 1,
        bbox: d.bbox,
        label: 'DANGER',
        short_description: d.label,
        detailed_reasoning: `Detected ${d.label}. In ${mode} mode this area is not safe.`,
        references_detections: [d.id],
        action: 'Stay away',
      });
    } else if (isSafe && d.confidence > 0.3) {
      safeCount++;
      zones.push({
        id: `zone_safe_${i}`,
        type: 'safe',
        priority: 1,
        bbox: d.bbox,
        label: 'SAFE',
        short_description: d.label,
        detailed_reasoning: `Detected ${d.label}. In ${mode} mode this can be a safer spot.`,
        references_detections: [d.id],
        action: 'Move here if possible',
      });
    }
  });

  const overall = Math.max(0, 100 - dangerCount * 25 + safeCount * 10);
  const exit_routes: ExitRoute[] = detection.detections
    .filter((d) => labelMatches(d.label, ['door', 'exit', 'stair']))
    .slice(0, 2)
    .map((d, i) => ({
      id: `exit_${i}`,
      priority: i + 1,
      path_description: d.label,
      bbox: d.bbox,
      is_blocked: false,
      notes: null,
    }));

  const actions: SafetyAction[] = [];
  if (zones.some((z) => z.type === 'safe')) {
    actions.push({
      priority: 1,
      instruction: 'Move toward a green SAFE zone if you can.',
      direction: null,
      urgency: 'immediate',
    });
  }
  if (zones.some((z) => z.type === 'danger')) {
    actions.push({
      priority: 2,
      instruction: 'Avoid areas marked in red.',
      direction: null,
      urgency: 'immediate',
    });
  }
  actions.push({
    priority: 3,
    instruction: `Safety score: ${overall}/100. ${safeCount} safer areas, ${dangerCount} hazards.`,
    direction: null,
    urgency: 'recommended',
  });

  const voice_response =
    safeCount > 0 || dangerCount > 0
      ? `Found ${safeCount} safer areas and ${dangerCount} hazards. ${actions[0]?.instruction ?? 'Stay alert.'} Safety score: ${overall} out of 100.`
      : `Analysis complete. Safety score: ${overall} out of 100. Stay alert.`;

  return {
    frame_id: frameId,
    mode,
    analysis_timestamp: new Date().toISOString(),
    safety_score: {
      overall,
      structural: overall,
      egress: exit_routes.length > 0 ? 80 : 50,
      hazard_exposure: Math.max(0, 100 - dangerCount * 30),
    },
    zones,
    exit_routes,
    actions,
    voice_response,
    risks_summary: {
      total_count: riskDescriptions.length,
      critical_count: dangerCount,
      descriptions: riskDescriptions.length ? riskDescriptions : ['No high-confidence hazards identified.'],
    },
  };
}
