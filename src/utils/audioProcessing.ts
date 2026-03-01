/**
 * RMS and silence detection for audio capture.
 * Silence: 20 * log10(rms) < threshold_db
 */

export function computeRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length) || 0;
}

export function rmsToDb(rms: number): number {
  if (rms <= 0) return -100; // silence
  return 20 * Math.log10(rms);
}

export function isSilent(rms: number, thresholdDb: number): boolean {
  return rmsToDb(rms) < thresholdDb;
}
