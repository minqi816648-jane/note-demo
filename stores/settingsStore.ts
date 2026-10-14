import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';
type AIProvider = 'qwen' | 'deepseek';

interface SettingsState {
  // 状态
  theme: ThemeMode;
  aiProvider: AIProvider;
  autoClassify: boolean;
  voiceAutoText: boolean;
  ocrEnabled: boolean;
  defaultFolderId: string | null;
  /** 首次引导（Onboarding）是否已完成（§4.6）；true=跳过引导 */
  onboardingCompleted: boolean;
  isLoading: boolean;

  // 操作
  loadSettings: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setAIProvider: (provider: AIProvider) => Promise<void>;
  setAutoClassify: (enabled: boolean) => Promise<void>;
  setVoiceAutoText: (enabled: boolean) => Promise<void>;
  setOcrEnabled: (enabled: boolean) => Promise<void>;
  setDefaultFolder: (folderId: string | null) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
}

const STORAGE_KEYS = {
  theme: 'settings_theme',
  aiProvider: 'settings_ai_provider',
  autoClassify: 'settings_auto_classify',
  voiceAutoText: 'settings_voice_auto_text',
  ocrEnabled: 'settings_ocr_enabled',
  defaultFolder: 'settings_default_folder',
  onboardingCompleted: 'settings_onboarding_completed',
} as const;

export const useSettingsStore = create<SettingsState>((set) => ({
  // 初始状态
  theme: 'light',
  aiProvider: 'qwen',
  autoClassify: true,
  voiceAutoText: true,
  ocrEnabled: true,
  defaultFolderId: null,
  onboardingCompleted: false,
  isLoading: false,

  // ========== 操作 ==========

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const [
        theme,
        aiProvider,
        autoClassify,
        voiceAutoText,
        ocrEnabled,
        defaultFolder,
        onboardingCompleted,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.theme),
        AsyncStorage.getItem(STORAGE_KEYS.aiProvider),
        AsyncStorage.getItem(STORAGE_KEYS.autoClassify),
        AsyncStorage.getItem(STORAGE_KEYS.voiceAutoText),
        AsyncStorage.getItem(STORAGE_KEYS.ocrEnabled),
        AsyncStorage.getItem(STORAGE_KEYS.defaultFolder),
        AsyncStorage.getItem(STORAGE_KEYS.onboardingCompleted),
      ]);

      set({
        theme: (theme as ThemeMode) || 'light',
        aiProvider: (aiProvider as AIProvider) || 'qwen',
        autoClassify: autoClassify ? autoClassify === 'true' : true,
        voiceAutoText: voiceAutoText ? voiceAutoText === 'true' : true,
        ocrEnabled: ocrEnabled ? ocrEnabled === 'true' : true,
        defaultFolderId: defaultFolder || null,
        onboardingCompleted: onboardingCompleted ? onboardingCompleted === 'true' : false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem(STORAGE_KEYS.theme, theme);
  },

  setAIProvider: async (aiProvider) => {
    set({ aiProvider });
    await AsyncStorage.setItem(STORAGE_KEYS.aiProvider, aiProvider);
  },

  setAutoClassify: async (autoClassify) => {
    set({ autoClassify });
    await AsyncStorage.setItem(STORAGE_KEYS.autoClassify, String(autoClassify));
  },

  setVoiceAutoText: async (voiceAutoText) => {
    set({ voiceAutoText });
    await AsyncStorage.setItem(STORAGE_KEYS.voiceAutoText, String(voiceAutoText));
  },

  setOcrEnabled: async (ocrEnabled) => {
    set({ ocrEnabled });
    await AsyncStorage.setItem(STORAGE_KEYS.ocrEnabled, String(ocrEnabled));
  },

  setDefaultFolder: async (defaultFolderId) => {
    set({ defaultFolderId });
    await AsyncStorage.setItem(STORAGE_KEYS.defaultFolder, defaultFolderId || '');
  },

  setOnboardingCompleted: async (completed) => {
    set({ onboardingCompleted: completed });
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, String(completed));
  },
}));
