/**
 * Zone tracking types (smoothed, persistent zones across frames).
 */

import type { BoundingBox } from './detection';
import type { ZoneType } from './analysis';

export interface TrackedZone {
  persistent_id: string;
  current_bbox: BoundingBox;
  smoothed_bbox: BoundingBox;
  type: ZoneType;
  label: string;
  short_description: string;
  detailed_reasoning: string;
  frames_since_seen: number;
  confidence: number;
  history: BoundingBox[];
}

export interface TrackedZoneState {
  tracked_zones: Record<string, TrackedZone>;
  frame_count: number;
  last_major_scene_change: number;
}
