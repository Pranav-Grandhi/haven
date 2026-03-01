/**
 * Gyroscope-driven 360° room scan.
 *
 * Instead of capturing frames on a fixed timer, the device's gyroscope detects
 * actual rotation. A frame is captured every CAPTURE_EVERY_DEG degrees of real
 * angular movement, so the user pans at any speed and gets full coverage.
 *
 * start() returns a Promise<ScanFrame[]> that resolves when 360° is reached.
 * cancel() aborts mid-scan.
 *
 * Falls back to a time-based sweep on web / simulator where the gyroscope
 * is unavailable.
 */

import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import type { CameraCaptureRef } from '../components/CameraPlaceholder';

/** Degrees of rotation that trigger one frame capture. 360 / 15 = 24 frames. */
const CAPTURE_EVERY_DEG = 15;
/** Full rotation target. */
const TOTAL_DEG = 360;
/** Ignore gyroscope readings below this rate (rad/s) — filters out hand tremor. */
const NOISE_FLOOR_RADS = 0.05;
/** Gyroscope poll rate in ms. */
const GYRO_INTERVAL_MS = 50;

/** Fallback: time (ms) between frames when gyro is unavailable. */
const FALLBACK_INTERVAL_MS = 220;
/** Fallback: total frames to capture (simulates 360°). */
const FALLBACK_FRAMES = 24;

export interface ScanFrame {
  frame_id: string;
  uri: string;
  width?: number;
  height?: number;
  /** When set, avoids reading from uri (e.g. from takePictureAsync({ base64: true })). */
  base64?: string;
}

interface Use360Options {
  cameraRef: React.RefObject<CameraCaptureRef>;
  /** Called on every degree-progress update (0–360). */
  onProgress: (degrees: number) => void;
  /** Called each time a frame is captured. */
  onFrame: (frame: ScanFrame, index: number) => void;
}

export function use360Scan({ cameraRef, onProgress, onFrame }: Use360Options) {
  const cancelRef = useRef<(() => void) | null>(null);

  const captureOne = useCallback(
    async (index: number): Promise<ScanFrame | null> => {
      const photo = await cameraRef.current?.takePictureAsync?.();
      if (!photo?.uri) return null;
      const frame: ScanFrame = {
        frame_id: `frame_${Date.now()}_${index}`,
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      };
      onFrame(frame, index);
      return frame;
    },
    [cameraRef, onFrame]
  );

  /**
   * Gyroscope path: resolves when the user has physically rotated 360°.
   * Captures one frame every CAPTURE_EVERY_DEG degrees of real rotation.
   */
  const startGyroscope = useCallback(
    (resolve: (frames: ScanFrame[]) => void, reject: (e: Error) => void) => {
      let Gyroscope: any;
      try {
        ({ Gyroscope } = require('expo-sensors'));
      } catch {
        reject(new Error('expo-sensors not available'));
        return;
      }

      const frames: ScanFrame[] = [];
      let cumDeg = 0;
      let lastCaptureDeg = 0;
      let lastTime = 0;
      let frameIndex = 0;
      let done = false;
      let capturing = false;

      Gyroscope.setUpdateInterval(GYRO_INTERVAL_MS);

      const sub = Gyroscope.addListener(async ({ x, y, z }: { x: number; y: number; z: number }) => {
        if (done) return;

        const now = Date.now();
        if (lastTime === 0) {
          // Capture starting frame immediately on first gyro reading
          lastTime = now;
          const first = await captureOne(frameIndex++);
          if (first) frames.push(first);
          lastCaptureDeg = 0;
          return;
        }

        // Cap dt so a long pause doesn't produce a sudden large jump
        const dt = Math.min((now - lastTime) / 1000, 0.15);
        lastTime = now;

        // Use the dominant horizontal rotation axis.
        // z = dominant when phone held upright (portrait).
        // y = dominant when phone held flat.
        // We take the weighted max so either grip works.
        const rate = Math.max(Math.abs(z), Math.abs(y) * 0.6, Math.abs(x) * 0.3);

        if (rate > NOISE_FLOOR_RADS) {
          cumDeg += rate * (180 / Math.PI) * dt;
          onProgress(Math.min(cumDeg, TOTAL_DEG));
        }

        // Capture a frame every CAPTURE_EVERY_DEG degrees
        if (!capturing && cumDeg - lastCaptureDeg >= CAPTURE_EVERY_DEG) {
          lastCaptureDeg = cumDeg;
          capturing = true;
          const f = await captureOne(frameIndex++);
          if (f) frames.push(f);
          capturing = false;
        }

        // Full 360° reached
        if (cumDeg >= TOTAL_DEG && !done) {
          done = true;
          sub.remove();
          onProgress(TOTAL_DEG);
          resolve(frames);
        }
      });

      cancelRef.current = () => {
        done = true;
        sub.remove();
        reject(new Error('cancelled'));
      };
    },
    [captureOne, onProgress]
  );

  /**
   * Fallback for web / simulator: time-based capture at fixed intervals,
   * with progress reported as if rotating at a steady rate.
   */
  const startFallback = useCallback(
    (resolve: (frames: ScanFrame[]) => void, reject: (e: Error) => void) => {
      const frames: ScanFrame[] = [];
      let index = 0;
      let cancelled = false;
      const degPerFrame = TOTAL_DEG / FALLBACK_FRAMES;

      const tick = async () => {
        if (cancelled) return;
        if (index >= FALLBACK_FRAMES) {
          onProgress(TOTAL_DEG);
          resolve(frames);
          return;
        }
        const f = await captureOne(index++);
        if (f) frames.push(f);
        onProgress(Math.min(index * degPerFrame, TOTAL_DEG));
        setTimeout(tick, FALLBACK_INTERVAL_MS);
      };

      cancelRef.current = () => {
        cancelled = true;
        reject(new Error('cancelled'));
      };

      tick();
    },
    [captureOne, onProgress]
  );

  /** Begin the 360° scan. Returns all captured frames when complete. */
  const start = useCallback((): Promise<ScanFrame[]> => {
    return new Promise<ScanFrame[]>((resolve, reject) => {
      const isSimulator = Platform.OS === 'web' || __DEV__;
      // Try gyroscope on real devices; fall back on web / simulator
      try {
        const { Gyroscope } = require('expo-sensors');
        if (!Gyroscope) throw new Error('no gyro');
        startGyroscope(resolve, (e) => {
          // Gyro failed mid-scan — fall back
          if (e.message !== 'cancelled') startFallback(resolve, reject);
          else reject(e);
        });
      } catch {
        startFallback(resolve, reject);
      }
    });
  }, [startGyroscope, startFallback]);

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  return { start, cancel };
}
