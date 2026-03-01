# expo-coreml-detection

On-device image classification / detection for ShelterScan using Apple Vision and Core ML (iOS).

## Behavior

- **iOS:** Uses Vision's `VNClassifyImageRequest` to get scene labels and confidence. Returns up to 15 classifications (label + confidence). Bounding boxes are full-frame (0,0,1,1) per label; for real object detection add a custom Core ML model (see below).
- **Android:** Returns an empty list (no Vision/Core ML).

## Usage

```ts
import { detectFromImageAsync } from 'expo-coreml-detection';

const results = await detectFromImageAsync('file:///path/to/image.jpg');
// [{ id, label, confidence, x1, y1, x2, y2 }, ...]
```

## Development build required

This module includes native code. Use a development build, not Expo Go:

```bash
npx expo run:ios
```

## Adding a custom Core ML model (YOLO)

1. Export your YOLOv8 (or other) model to Core ML (`.mlpackage` or `.mlmodel`).
2. Add the model to the Xcode project under `modules/expo-coreml-detection/ios/` and ensure it’s in the app target.
3. Update `CoremlDetectionModule.swift` to load your model with `VNCoreMLModel` and `VNCoreMLRequest`, run it, and map outputs to the same `[[String: Any]]` format (id, label, confidence, x1, y1, x2, y2).

Until then, the module uses `VNClassifyImageRequest` for scene labels only.
