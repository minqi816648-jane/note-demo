// ============================================
// AI API Key 安全存储
// 使用系统安全存储 (Keystore/Keychain)
// ============================================

import * as SecureStore from 'expo-secure-store';
import type { AIProviderName } from './types';

const PREFIX = 'note_demo_ai_key_';

/**
 * 保存某个 Provider 的 API Key
 */
export async function saveApiKey(provider: AIProviderName, apiKey: string): Promise<void> {
  if (!apiKey) {
    await SecureStore.deleteItemAsync(keyOf(provider));
    return;
  }
  // keychainAccessible：设备首次解锁后本设备可访问，且不跨设备 iCloud Keychain 同步，
  // 降低备份/换设备携带密钥的风险（避免每次读取都强制生物识别影响 AI 体验）。
  await SecureStore.setItemAsync(keyOf(provider), apiKey, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

/**
 * 读取某个 Provider 的 API Key
 */
export async function getApiKey(provider: AIProviderName): Promise<string | null> {
  return SecureStore.getItemAsync(keyOf(provider));
}

/**
 * 获取已配置好 Key 的 Provider 列表（用于选择）
 */
export async function getConfiguredProviders(): Promise<AIProviderName[]> {
  const providers: AIProviderName[] = ['qwen', 'deepseek'];
  const results = await Promise.all(
    providers.map(async (p) => {
      const key = await getApiKey(p);
      return key ? p : null;
    })
  );
  return results.filter((p): p is AIProviderName => p !== null);
}

function keyOf(provider: AIProviderName): string {
  return `${PREFIX}${provider}`;
}
