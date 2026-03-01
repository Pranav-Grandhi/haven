import type { SafetyZone, BoundingBox } from '../types';
import type { TrackedZone, TrackedZoneState } from '../types';
import { iou, smoothBbox } from './geometry';

const IOU_THRESHOLD = 0.5;
const FRAMES_BEFORE_REMOVE = 3;
const SMOOTH_ALPHA = 0.3;
const SCENE_CHANGE_UNMATCHED_RATIO = 0.6;

/**
 * Match new zones to existing tracked zones by IoU; update or create tracked zones.
 */
export function updateZoneTracking(
  previous: TrackedZoneState,
  newZones: SafetyZone[]
): TrackedZoneState {
  const tracked = { ...previous.tracked_zones };
  const used = new Set<string>();

  for (const zone of newZones) {
    let bestId: string | null = null;
    let bestIou = 0;
    for (const [pid, tz] of Object.entries(tracked)) {
      if (used.has(pid)) continue;
      const score = iou(zone.bbox, tz.smoothed_bbox);
      if (score > IOU_THRESHOLD && score > bestIou) {
        bestIou = score;
        bestId = pid;
      }
    }

    if (bestId && tracked[bestId]) {
      used.add(bestId);
      const prev = tracked[bestId];
      const smoothed = smoothBbox(zone.bbox, prev.smoothed_bbox, SMOOTH_ALPHA);
      const history = [...prev.history, smoothed].slice(-5);
      tracked[bestId] = {
        ...prev,
        current_bbox: zone.bbox,
        smoothed_bbox: smoothed,
        type: zone.type,
        label: zone.label,
        short_description: zone.short_description,
        detailed_reasoning: zone.detailed_reasoning,
        frames_since_seen: 0,
        confidence: 0.95,
        history,
      };
    } else {
      const persistentId = `persistent_${Date.now()}_${zone.id}`;
      tracked[persistentId] = {
        persistent_id: persistentId,
        current_bbox: zone.bbox,
        smoothed_bbox: { ...zone.bbox },
        type: zone.type,
        label: zone.label,
        short_description: zone.short_description,
        detailed_reasoning: zone.detailed_reasoning,
        frames_since_seen: 0,
        confidence: 0.95,
        history: [zone.bbox],
      };
    }
  }

  for (const pid of Object.keys(tracked)) {
    if (used.has(pid)) continue;
    const tz = tracked[pid];
    const next = tz.frames_since_seen + 1;
    if (next > FRAMES_BEFORE_REMOVE) delete tracked[pid];
    else tracked[pid] = { ...tz, frames_since_seen: next };
  }

  const unmatchedCount = Object.keys(previous.tracked_zones).length - used.size;
  const totalPrevious = Object.keys(previous.tracked_zones).length;
  const majorSceneChange =
    totalPrevious > 0 && unmatchedCount / totalPrevious >= SCENE_CHANGE_UNMATCHED_RATIO;

  const nextTracked = majorSceneChange ? {} : tracked;
  const nextFrameCount = majorSceneChange ? 0 : previous.frame_count + 1;

  return {
    tracked_zones: nextTracked,
    frame_count: nextFrameCount,
    last_major_scene_change: majorSceneChange ? previous.frame_count : previous.last_major_scene_change,
  };
}
