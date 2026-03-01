/**
 * Frame input from video scan team.
 */

export interface FrameInput {
  frame_id: string;
  image_data: string; // Base64 encoded JPEG/PNG (optional when image_uri is set)
  image_uri?: string; // File URI for Core ML (file:// or content://)
  image_width?: number;
  image_height?: number;
  timestamp: number;
  metadata: {
    camera_motion: 'stable' | 'moving' | 'panning';
    blur_score: number | null;
    sequence_index: number;
  };
}
