/**
 * Safety analysis types (from GPT-4o Safety Reasoner).
 */

import type { BoundingBox } from './detection';

export type DisasterMode =
  | 'earthquake'
  | 'flood'
  | 'tornado'
  | 'blast'
  | 'fire'
  | 'hazmat'
  | 'hurricane'
  | 'nuclear'
  | 'lockdown'
  | 'winter';

export type ZoneType = 'safe' | 'danger' | 'caution' | 'exit';

export type ActionUrgency = 'immediate' | 'recommended' | 'if_time_allows';

export interface SafetyZone {
  id: string;
  type: ZoneType;
  priority: number; // 1 = highest
  bbox: BoundingBox;
  label: string;
  short_description: string;
  detailed_reasoning: string;
  references_detections: number[];
  action: string | null;
}

export interface ExitRoute {
  id: string;
  priority: number;
  path_description: string;
  bbox: BoundingBox;
  is_blocked: boolean;
  notes: string | null;
}

export interface SafetyAction {
  priority: number;
  instruction: string;
  direction: string | null; // "left", "right", "behind", "ahead"
  urgency: ActionUrgency;
}

export interface SafetyAnalysis {
  frame_id: string;
  mode: DisasterMode;
  analysis_timestamp: string; // ISO 8601
  safety_score: {
    overall: number; // 0-100
    structural: number;
    egress: number;
    hazard_exposure: number;
  };
  zones: SafetyZone[];
  exit_routes: ExitRoute[];
  actions: SafetyAction[];
  voice_response: string;
  risks_summary: {
    total_count: number;
    critical_count: number;
    descriptions: string[];
  };
}
