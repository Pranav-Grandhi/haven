import type { SafetyAnalysis, SafetyZone } from '../types';
import type { RoomSummary } from '../state/slices/analysisSlice';

/**
 * Pick the analysis with the highest overall safety score (best single frame).
 */
export function selectBestFrame(analyses: SafetyAnalysis[]): SafetyAnalysis | null {
  if (analyses.length === 0) return null;
  return analyses.reduce((best, a) =>
    (a.safety_score?.overall ?? 0) > (best.safety_score?.overall ?? 0) ? a : best
  );
}

/**
 * Build room summary from current analysis and recent history (what we've seen while scanning).
 * Gives: safest spot, what to do, what to avoid.
 */
export function computeRoomSummary(
  current: SafetyAnalysis | null,
  history: SafetyAnalysis[]
): RoomSummary | null {
  const analyses = current ? [current, ...history.filter((h) => h.frame_id !== current.frame_id)] : history;
  if (analyses.length === 0) return null;

  const allSafeZones: SafetyZone[] = [];
  const allDangerLabels = new Set<string>();
  const allWhatToDo = new Set<string>();
  const allRisks = new Set<string>();

  for (const a of analyses) {
    for (const z of a.zones) {
      if (z.type === 'safe') allSafeZones.push(z);
      if (z.type === 'danger' || z.type === 'caution') {
        allDangerLabels.add(z.label);
        if (z.short_description) allDangerLabels.add(z.short_description);
      }
    }
    for (const act of a.actions) {
      if (act.instruction?.trim()) allWhatToDo.add(act.instruction.trim());
    }
    for (const d of a.risks_summary?.descriptions ?? []) {
      if (d?.trim()) allRisks.add(d.trim());
    }
  }

  // Safest: top-priority safe zone from latest analysis, or first safe zone we've seen
  const latest = analyses[0];
  const safeZonesLatest = latest.zones.filter((z) => z.type === 'safe').sort((a, b) => a.priority - b.priority);
  const safestZone = safeZonesLatest[0] ?? allSafeZones[0];
  const safest = safestZone
    ? `${safestZone.label}: ${safestZone.short_description || safestZone.detailed_reasoning?.slice(0, 80) || 'Best cover in this space.'}`
    : 'No clear safe zone identified. Move to an interior area away from windows and heavy furniture.';

  // What to do: actions (prioritized), then "Stay in [safest]" if we have one
  const whatToDo: string[] = [];
  const sortedActions = latest.actions.slice().sort((a, b) => a.priority - b.priority);
  for (const a of sortedActions) {
    if (a.instruction?.trim()) whatToDo.push(a.instruction.trim());
  }
  if (safestZone && whatToDo.length === 0) {
    whatToDo.push(safestZone.action || `Move to ${safestZone.label.toLowerCase()}`);
  }
  if (whatToDo.length === 0) whatToDo.push('Stay low. Cover your head. Move away from windows and glass.');

  // What to avoid: danger zone labels + risk descriptions
  const whatToAvoid: string[] = [];
  for (const z of latest.zones) {
    if ((z.type === 'danger' || z.type === 'caution') && z.short_description) {
      whatToAvoid.push(z.short_description);
    }
  }
  for (const r of allRisks) {
    if (r && !whatToAvoid.some((a) => a.includes(r) || r.includes(a))) whatToAvoid.push(r);
  }
  const dangerLabels = Array.from(allDangerLabels).filter((l) => l.length > 2 && l.length < 120);
  for (const l of dangerLabels) {
    if (!whatToAvoid.some((a) => a === l || a.includes(l))) whatToAvoid.push(l);
  }
  if (whatToAvoid.length === 0) whatToAvoid.push('Windows, glass, and unsecured tall furniture.');

  return {
    safest,
    whatToDo: whatToDo.slice(0, 6),
    whatToAvoid: whatToAvoid.slice(0, 6),
  };
}
