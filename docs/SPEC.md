# ShelterScan Technical Specification

See the full **ShelterScan Technical Specification v2.0** in the project brief. This file is a placeholder; the canonical spec is the document used to implement the app.

## Implemented structure (Haven codebase)

- **Types:** `src/types/` (detection, analysis, zones, voice, frame)
- **State:** `src/state/store.ts` + `src/state/slices/*`
- **Constants:** `src/constants/` (disasterModes, colors, prompts, audio)
- **Utils:** `src/utils/` (geometry, audioProcessing, formatting, zoneTracker)
- **Services:** `src/services/` (api, commandParser, objectDetection, safetyReasoner, **localObjectDetection**, **localSafetyReasoner**)
- **Hooks:** `src/hooks/` (useAnalysis, useFrameReceiver, useSpeechSynthesis, useZoneTracking)
- **Components:** `src/components/` (HUD, OverlayCanvas, ZoneOverlay, DetailCard, ModeSelector, ScanButton, ControlBar, CameraPlaceholder)
- **Screen:** `app/(tabs)/index.tsx` — ShelterScan main screen

## Running the app

- **Expo Go:** Run `npx expo start` and open in the Expo Go app. Local AI native modules are not available here, so the app uses **mock detection** and **mock/GPT-4o reasoning** (with fallback). Everything works.
- **Development build (local AI):** To use on-device YOLO + LLM, create a dev build: `npx expo run:ios` or `npx expo run:android`. Then add model files (see below).

## Environment (optional)

- `EXPO_PUBLIC_OPENAI_API_KEY` — GPT-4o safety reasoning when local LLM is not used (omit for mock)
- `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_DETECTION_API_URL` — detection API (omit for mock)
- `EXPO_PUBLIC_LOCAL_LLM_PATH` — path to GGUF model for local safety reasoning (e.g. `/path/to/smol.gguf`). If unset, app looks for `safety_model.gguf` in the app document directory.
- `EXPO_PUBLIC_LOCAL_YOLO_PATH` — path to ONNX YOLO model for local detection (optional; preprocessing still TODO)
