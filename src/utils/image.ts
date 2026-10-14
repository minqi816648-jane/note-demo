import * as ImagePicker from 'expo-image-picker';

export interface PickedImageAsset {
  /** 原始 uri（相册/相机返回，可能位于缓存目录） */
  uri: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
}

const QUALITY = 0.8;

/**
 * 请求相册权限
 */
export async function requestImageLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * 请求相机权限
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * 从相册选择一张图片
 */
export async function pickImageFromLibrary(): Promise<PickedImageAsset | null> {
  const granted = await requestImageLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: QUALITY,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || guessMimeType(asset.uri),
    fileName: asset.fileName || `image_${Date.now()}`,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
  };
}

/**
 * 调用相机拍摄一张图片
 */
export async function takePhoto(): Promise<PickedImageAsset | null> {
  const granted = await requestCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: QUALITY,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || guessMimeType(asset.uri),
    fileName: asset.fileName || `camera_${Date.now()}.jpg`,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
  };
}

/**
 * 根据扩展名猜测 MIME 类型
 */
function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}
