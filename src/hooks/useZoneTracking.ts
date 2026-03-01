import { useStore } from '../state/store';
import type { TrackedZone } from '../types';

export interface DisplayZone {
  id: string;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  type: TrackedZone['type'];
  label: string;
  short_description: string;
  detailed_reasoning: string;
}

/** Bbox area (0–1). Full-frame (e.g. Core ML scene labels) is ~1. */
function bboxArea(bbox: { x1: number; y1: number; x2: number; y2: number }): number {
  return (bbox.x2 - bbox.x1) * (bbox.y2 - bbox.y1);
}

const FULL_FRAME_THRESHOLD = 0.9;

/**
 * Expose zones for overlay rendering and identified safe/danger list from camera.
 * Zones with full-frame bboxes (e.g. from scene classification) are listed as "Identified" instead of drawn as overlays.
 */
export function useZoneTracking(): {
  displayZones: DisplayZone[];
  overlayZones: DisplayZone[];
  identifiedSummary: { safe: string[]; danger: string[] };
  exitRoutes: Array<{ id: string; bbox: { x1: number; y1: number; x2: number; y2: number }; priority: number }>;
} {
  const tracked_zones = useStore((s) => s.tracked_zones);
  const current = useStore((s) => s.current);
  const rawZones = current?.zones ?? [];
  const exitRoutes = current?.exit_routes ?? [];
  const tracked = Object.values(tracked_zones.tracked_zones);

  const displayZones: DisplayZone[] =
    tracked.length > 0
      ? tracked.map((t) => ({
          id: t.persistent_id,
          bbox: t.smoothed_bbox,
          type: t.type,
          label: t.label,
          short_description: t.short_description,
          detailed_reasoning: t.detailed_reasoning,
        }))
      : rawZones.map((z) => ({
          id: z.id,
          bbox: z.bbox,
          type: z.type,
          label: z.label,
          short_description: z.short_description,
          detailed_reasoning: z.detailed_reasoning,
        }));

  const overlayZones = displayZones.filter((z) => bboxArea(z.bbox) < FULL_FRAME_THRESHOLD);
  const safe: string[] = [];
  const danger: string[] = [];
  displayZones.forEach((z) => {
    const name = z.short_description || z.label;
    if (z.type === 'safe' && name) safe.push(name);
    else if (z.type === 'danger' && name) danger.push(name);
  });

  return {
    displayZones,
    overlayZones,
    identifiedSummary: { safe: [...new Set(safe)], danger: [...new Set(danger)] },
    exitRoutes: exitRoutes.map((e) => ({
      id: e.id,
      bbox: e.bbox,
      priority: e.priority,
    })),
  };
}
