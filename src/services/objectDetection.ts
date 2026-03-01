import type { DetectionResult } from '../types';

const DETECTION_API = process.env.EXPO_PUBLIC_DETECTION_API_URL ?? '';
const USE_MOCK = !DETECTION_API;

/** Simple hash so each scan can get a different mock scene. */
function hashFrameId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Mock scenes: different layouts so rescanning shows different safe/danger zones. */
const MOCK_SCENES: Array<Array<{ label: string; category: string; x1: number; y1: number; x2: number; y2: number; confidence: number }>> = [
  // Scene 0: desk (safe), window (danger), wall (safe)
  [
    { label: 'desk', category: 'furniture', x1: 0.2, y1: 0.4, x2: 0.5, y2: 0.8, confidence: 0.92 },
    { label: 'window', category: 'structural', x1: 0.6, y1: 0.1, x2: 0.9, y2: 0.6, confidence: 0.97 },
    { label: 'wall', category: 'structural', x1: 0.08, y1: 0.45, x2: 0.22, y2: 0.95, confidence: 0.9 },
  ],
  // Scene 1: chair (safe), shelf (danger), table (safe)
  [
    { label: 'chair', category: 'furniture', x1: 0.15, y1: 0.5, x2: 0.35, y2: 0.85, confidence: 0.88 },
    { label: 'shelf', category: 'structural', x1: 0.55, y1: 0.2, x2: 0.85, y2: 0.55, confidence: 0.91 },
    { label: 'table', category: 'furniture', x1: 0.4, y1: 0.55, x2: 0.7, y2: 0.82, confidence: 0.89 },
  ],
  // Scene 2: glass (danger), door (safe/exit), wall (safe)
  [
    { label: 'glass', category: 'structural', x1: 0.5, y1: 0.15, x2: 0.8, y2: 0.5, confidence: 0.93 },
    { label: 'door', category: 'structural', x1: 0.1, y1: 0.35, x2: 0.3, y2: 0.95, confidence: 0.9 },
    { label: 'wall', category: 'structural', x1: 0.75, y1: 0.4, x2: 0.95, y2: 0.9, confidence: 0.87 },
  ],
  // Scene 3: mirror (danger), desk (safe), chair (safe)
  [
    { label: 'mirror', category: 'structural', x1: 0.6, y1: 0.25, x2: 0.9, y2: 0.65, confidence: 0.94 },
    { label: 'desk', category: 'furniture', x1: 0.12, y1: 0.45, x2: 0.45, y2: 0.8, confidence: 0.91 },
    { label: 'chair', category: 'furniture', x1: 0.48, y1: 0.6, x2: 0.68, y2: 0.88, confidence: 0.86 },
  ],
  // Scene 4: bookcase (danger), table (safe), stair (exit)
  [
    { label: 'bookcase', category: 'structural', x1: 0.5, y1: 0.1, x2: 0.88, y2: 0.6, confidence: 0.9 },
    { label: 'table', category: 'furniture', x1: 0.08, y1: 0.5, x2: 0.38, y2: 0.78, confidence: 0.88 },
    { label: 'stair', category: 'exits', x1: 0.7, y1: 0.55, x2: 0.95, y2: 0.95, confidence: 0.85 },
  ],
];

/**
 * Mock detection for when no API is configured. Varies by frameId so each rescan can show different zones.
 */
function mockDetection(frameId: string, _imageBase64: string): DetectionResult {
  const sceneIndex = hashFrameId(frameId) % MOCK_SCENES.length;
  const scene = MOCK_SCENES[sceneIndex];
  const detections = scene.map((d, i) => ({
    id: i + 1,
    label: d.label,
    category: d.category as 'furniture' | 'structural' | 'exits' | 'hazards',
    bbox: { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 },
    confidence: d.confidence,
    attributes: {
      estimated_height_m: null as number | null,
      anchored_to_wall: null as boolean | null,
      material: null as string | null,
      is_structural: null as boolean | null,
    },
  }));
  return {
    frame_id: frameId,
    timestamp: Date.now() / 1000,
    image_dimensions: { width: 1920, height: 1080 },
    detections,
    scene_analysis: {
      room_type: 'office',
      estimated_floor_level: 1,
      has_exterior_wall: scene.some((d) => d.label === 'window'),
      window_coverage_percent: scene.some((d) => d.label === 'window') ? 25 : 0,
    },
  };
}

export interface DetectOptions {
  frameId: string;
  imageBase64: string;
  timeoutMs?: number;
}

/**
 * Run object detection on a frame. Uses mock when no API URL is set.
 */
export async function detectObjects(options: DetectOptions): Promise<DetectionResult> {
  const { frameId, imageBase64, timeoutMs = 10000 } = options;

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400)); // Simulate latency
    return mockDetection(frameId, imageBase64);
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${DETECTION_API}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frame_id: frameId, image: imageBase64 }),
    signal: controller.signal,
  });
  clearTimeout(id);
  if (!res.ok) throw new Error(`Detection failed: ${res.statusText}`);
  return res.json() as Promise<DetectionResult>;
}
