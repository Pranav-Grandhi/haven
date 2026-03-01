/**
 * Audio capture configuration (from spec).
 */

export const AUDIO_CONFIG = {
  sample_rate: 16000,
  channels: 1,
  bit_depth: 16,
  silence_threshold_db: -40,
  silence_duration_ms: 1500,
  max_recording_duration_ms: 30000,
  min_recording_duration_ms: 500,
  rms_check_interval_ms: 100,
} as const;
