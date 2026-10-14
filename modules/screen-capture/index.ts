import { requireNativeModule } from 'expo-modules-core';

export interface ScreenCaptureResult {
  filePath: string;
}

const ScreenCaptureNative = requireNativeModule('ScreenCapture');

export async function captureScreenAsync(): Promise<ScreenCaptureResult> {
  const filePath: string = await ScreenCaptureNative.captureAsync();
  return { filePath };
}
