# Video Team Integration Guide

ShelterScan consumes **frames** from the video scan pipeline. Use one of the following integration methods.

## Frame format

```typescript
interface FrameInput {
  frame_id: string;           // e.g. "frame_001"
  image_data: string;         // Base64 JPEG/PNG
  timestamp: number;           // Seconds from video start
  metadata: {
    camera_motion: 'stable' | 'moving' | 'panning';
    blur_score: number | null; // 0–1, skip if < 0.3
    sequence_index: number;
  };
}
```

## Option 1: Shared store (recommended)

Push frames into the Zustand store. ShelterScan subscribes and runs analysis when scanning is active.

```typescript
import { useStore } from '@/src/state/store';

// In your video component:
const setCurrentFrame = useStore((s) => s.setCurrentFrame);
setCurrentFrame({
  frame_id: `frame_${sequenceIndex}`,
  image_data: base64Image,
  timestamp: timeInSeconds,
  metadata: { camera_motion: 'stable', blur_score: 0.2, sequence_index: sequenceIndex },
});
```

## Option 2: Callback prop

If the scan screen is a child of your video component, pass an `onFrameReady` callback and call it with `FrameInput` when a frame is ready.

## Frame rate

- **Manual:** 1 frame per scan button press.
- **Auto-refresh:** 1 frame every 6–8 seconds (configurable).
- **Max:** ~1 fps for continuous scanning.

## Quality

- Resolution: 720p minimum, 1080p preferred.
- Skip frames with `blur_score < 0.3`.
