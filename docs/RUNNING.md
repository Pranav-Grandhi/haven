# Running Haven

Project uses **Expo SDK 55**. Use **Expo Go** to run the app (no Xcode or Android Studio required).

**Note:** Expo Go on the App Store/Play Store may still be SDK 54. For SDK 55 you can use the SDK 55 Expo Go build from the CLI on Android, or [TestFlight (iOS)](https://testflight.apple.com/join/GZJxxfUU), or run on **web** (`npx expo start --web`).

## Install dependencies (use npm)

From the project root, use **npm** (pnpm is not required):

```bash
cd /Users/riya/Desktop/haven
npm install
npx expo install --fix
```

Then start the app with `npx expo start`.

## 1. Start the dev server

From the project root:

```bash
cd /Users/riya/Desktop/haven
npx expo start
```

## 2. Open in Expo Go

- **iPhone / Android:** Install **Expo Go** from the App Store / Play Store. Scan the QR code shown in the terminal or in the browser.
- **iOS Simulator:** In the terminal, press `i` after `expo start` to open in the iOS simulator (Expo Go in simulator).
- **Web:** Press `w` or run `npx expo start --web` and open the URL in the browser.

## Room scan (safest area to hide)

When you tap **Done** after scanning the room, the app sends the captured frames to **OpenAI (GPT-4o)** to identify safe spots, hazards, and the best place to take cover. You need an API key:

1. Open the **`.env`** file in the project root and set:
   ```bash
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...your-key-here...
   ```
2. Get a key at [platform.openai.com](https://platform.openai.com/api-keys) (sign up, then Create new secret key).
3. **Restart the dev server** after changing `.env` — run `npx expo start` (or `npx expo start -c` to clear cache), then reload the app in Expo Go.

Without a valid key, the app will show an error and won’t show the result.

## Notes

- **Camera:** In Expo Go, allow camera when prompted. Scanning uses the camera; on device, analysis uses mock detection (Core ML requires a custom dev build).
- **Web:** Use HTTPS or localhost for camera. Run `npx expo start --web` and tap to allow camera if needed.
- You can ignore the `ios/` and `android/` folders when using Expo Go; they are only for custom native builds (e.g. with Xcode).
