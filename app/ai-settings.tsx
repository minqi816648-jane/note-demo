import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset, useBottomInset } from '../src/hooks/useSafeArea';
import { useSettingsStore } from '../stores/settingsStore';
import { getApiKey, saveApiKey } from '../services';
import type { AIProviderName } from '../services/ai';

const PROVIDERS: { value: AIProviderName; label: string; hint: string; url: string }[] = [
  { value: 'qwen', label: '通义千问 (Qwen)', hint: '前往 dashscope.aliyuncs.com 获取 API Key', url: 'https://bailian.console.aliyun.com/' },
  { value: 'deepseek', label: 'DeepSeek', hint: '前往 platform.deepseek.com 获取 API Key', url: 'https://platform.deepseek.com/' },
];

export default function AISettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();
  const { aiProvider, setAIProvider } = useSettingsStore();

  const [editingProvider, setEditingProvider] = useState<AIProviderName>(aiProvider);
  const [keyInput, setKeyInput] = useState('');
  const [configured, setConfigured] = useState<Partial<Record<AIProviderName, boolean>>>({});

  // 读取当前已配置的 Key
  useEffect(() => {
    loadState();
  }, []);

  const loadState = useCallback(async () => {
    const status: Partial<Record<AIProviderName, boolean>> = {};
    for (const p of PROVIDERS) {
      const key = await getApiKey(p.value);
      status[p.value] = Boolean(key);
    }
    setConfigured(status);
  }, []);

  const handleUseProvider = useCallback(
    async (value: AIProviderName) => {
      await setAIProvider(value);
      setEditingProvider(value);
      const key = await getApiKey(value);
      setKeyInput('');
      if (key) {
        // 已配置时预填掩码占位
      }
      loadState();
    },
    [setAIProvider, loadState]
  );

  const handleSave = useCallback(async () => {
    const key = keyInput.trim();
    if (!key) {
      Alert.alert('提示', '请输入 API Key');
      return;
    }
    await saveApiKey(editingProvider, key);
    setKeyInput('');
    await loadState();
    Alert.alert('已保存', `${PROVIDERS.find((p) => p.value === editingProvider)?.label} API Key 已保存`);
  }, [keyInput, editingProvider, loadState]);

  const handleReset = useCallback(async () => {
    Alert.alert('移除 API Key', '确定要移除该 Provider 的 API Key 吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: async () => {
          await saveApiKey(editingProvider, '');
          await loadState();
          Alert.alert('已移除');
        },
      },
    ]);
  }, [editingProvider, loadState]);

  const activeProvider = PROVIDERS.find((p) => p.value === editingProvider);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI 服务配置</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + bottomInset }]} showsVerticalScrollIndicator={false}>
        {/* Provider 选择 */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>选择 AI 服务商</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PROVIDERS.map((p, index) => {
            const isActive = editingProvider === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.providerRow,
                  {
                    backgroundColor: isActive ? colors.card : 'transparent',
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < PROVIDERS.length - 1 ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
                onPress={() => handleUseProvider(p.value)}
                activeOpacity={0.8}
              >
                <View style={styles.providerInfo}>
                  <Text style={[styles.providerLabel, { color: colors.textPrimary }]}>{p.label}</Text>
                  <Text style={[styles.providerHint, { color: colors.textSecondary }]}>
                    {configured[p.value] ? '✓ 已配置' : '未配置'}
                  </Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: isActive ? colors.primary : colors.border }]}>
                  {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* API Key 输入 */}
        {activeProvider && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>API Key</Text>
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.keyInput, { color: colors.textPrimary, backgroundColor: colors.card }]}
                placeholder={configured[editingProvider] ? '已配置（输入新 Key 覆盖）' : '粘贴你的 API Key'}
                placeholderTextColor={colors.textDisabled}
                value={keyInput}
                onChangeText={setKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                multiline={false}
              />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>{activeProvider.hint}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(activeProvider.url)}>
                <Text style={[styles.link, { color: colors.primary }]}>前往获取 →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>{configured[editingProvider] ? '更新 Key' : '保存 Key'}</Text>
              </TouchableOpacity>
              {configured[editingProvider] && (
                <TouchableOpacity
                  style={[styles.resetButton, { borderColor: colors.danger }]}
                  onPress={handleReset}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.resetButtonText, { color: colors.danger }]}>移除 Key</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View style={styles.footerNote}>
          <Text style={[styles.footerNoteText, { color: colors.textDisabled }]}>
            API Key 只保存在设备安全存储中（Keystore/Keychain），不会上传或保存到数据库。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.body,
  },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.m,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginTop: spacing.l,
    marginBottom: spacing.s,
    marginLeft: spacing.xs,
  },
  section: {
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: spacing.m,
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
  },
  providerInfo: {
    flex: 1,
  },
  providerLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  providerHint: {
    fontSize: fontSize.small,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  keyInput: {
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    fontSize: fontSize.body,
    minHeight: 44,
  },
  hint: {
    fontSize: fontSize.small,
    marginTop: spacing.s,
  },
  link: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.l,
  },
  saveButton: {
    flex: 1,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  resetButton: {
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  resetButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  footerNote: {
    marginTop: spacing.l,
    paddingHorizontal: spacing.s,
  },
  footerNoteText: {
    fontSize: fontSize.small,
    lineHeight: 18,
  },
});
