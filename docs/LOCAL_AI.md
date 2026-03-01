# Local AI (on-device inference)

ShelterScan can run **object detection** and **safety reasoning** locally so no images or prompts leave the device.

## How it works

- **Detection:** Tries `localObjectDetection` (ONNX YOLO) first; if that returns `null` (Expo Go, no model, or failure), falls back to cloud API or mock.
- **Reasoning:** Tries `localSafetyReasoner` (llama.rn + GGUF) first; if that returns `null`, falls back to GPT-4o or mock.

So the app **always runs** (including in Expo Go); local AI is used only when the native modules and model files are available.

## Expo Go vs development build

| Run with | Local detection | Local reasoning |
|----------|-----------------|-----------------|
| **Expo Go** (`expo start` → scan QR) | No (native ONNX not in Expo Go) | No (native llama.rn not in Expo Go) |
| **Dev build** (`expo run:ios` / `expo run:android`) | Yes, if model path set and preprocessing added | Yes, if GGUF model is present |

You can open the app in **Expo Go** for quick testing (mocks/API). For full local AI, use a development build and add the models below.

## Local safety reasoning (LLM)

1. **Get a GGUF model** (e.g. [SmolLM](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF), [Phi-2](https://huggingface.co/TheBloke/phi-2-GGUF), or [Llama 3.2 3B](https://huggingface.co/bartowski/Meta-Llama-3.2-3B-Instruct-GGUF)).
2. **Put the model where the app can read it:**
   - **Option A:** Set `EXPO_PUBLIC_LOCAL_LLM_PATH` to the full file path (e.g. `file:///path/to/model.gguf` or `/path/to/model.gguf`).
   - **Option B:** Copy the GGUF file to the app’s document directory and name it `safety_model.gguf`. The app checks `documentDirectory + 'safety_model.gguf'` when `EXPO_PUBLIC_LOCAL_LLM_PATH` is not set.
3. Run a **development build** (`npx expo run:ios` or `npx expo run:android`). Local reasoning runs only in a dev build; it is skipped in Expo Go (no native module).

## Local object detection (YOLO)

- Set `EXPO_PUBLIC_LOCAL_YOLO_PATH` to the path of your YOLOv8 (or compatible) ONNX model.
- Detection currently returns `null` until **preprocessing** is implemented (decode base64 → tensor, resize, run session, NMS, map to `DetectionResult`). When that’s done, local detection will be used in dev builds when the path is set and the model loads.

## Dependencies

- **onnxruntime-react-native** — local object detection (optional; app works without it in Expo Go).
- **llama.rn** — local LLM (optional; app works without it in Expo Go).
- **expo-file-system** — used for default LLM path (`documentDirectory`).

All usage of these is behind try/catch so the app does not crash when they’re missing or fail.
