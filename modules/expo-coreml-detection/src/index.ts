import { requireNativeModule } from 'expo-modules-core';

interface CoremlDetectionModule {
  detectFromImageAsync(uri: string): Promise<Array<{
    id: number;
    label: string;
    confidence: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>>;
}

let NativeModule: CoremlDetectionModule | null = null;
try {
  NativeModule = requireNativeModule<CoremlDetectionModule>('CoremlDetection');
} catch {
  // Native module not available (e.g. Expo Go). Use mock/fallback in app.
}

export async function detectFromImageAsync(uri: string): Promise<Array<{
  id: number;
  label: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>> {
  if (!NativeModule) return [];
  try {
    return await NativeModule.detectFromImageAsync(uri);
  } catch {
    return [];
  }
}
