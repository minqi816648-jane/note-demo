import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import type { RichTextEditorRef } from '../editor/RichTextEditor';
import { polishText, translateText } from '../../../services';
import { htmlToText } from '../../utils/html';

interface AIActionsBarProps {
  editorRef: React.RefObject<RichTextEditorRef | null>;
  onContentChanged?: (html: string) => void;
}

/**
 * 编辑器 AI 快捷操作条：润色 / 翻译
 * 对当前编辑器的「全文」进行 AI 处理并回填
 */
export function AIActionsBar({ editorRef, onContentChanged }: AIActionsBarProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'polish' | 'translate' | null>(null);

  const applyText = useCallback(
    async (text: string) => {
      if (!editorRef.current) return;
      // 将纯文本包装为段落 HTML 回填编辑器
      const html = text
        .split(/\n+/)
        .map((line) => `<p>${line.trim()}</p>`)
        .join('');
      editorRef.current.setHTML(html);
      onContentChanged?.(html);
    },
    [editorRef, onContentChanged]
  );

  const handlePolish = useCallback(async () => {
    if (busy || !editorRef.current) return;
    const html = await editorRef.current.getHTML();
    const text = htmlToText(html);
    if (!text.trim()) {
      Alert.alert('提示', '编辑器内容为空，无法润色');
      return;
    }
    setBusy('polish');
    try {
      const result = await polishText(text);
      if (result == null) {
        Alert.alert('提示', '请先配置 AI API Key（设置 → AI 服务）');
      } else {
        await applyText(result);
      }
    } catch {
      Alert.alert('润色失败', '请检查网络后重试');
    } finally {
      setBusy(null);
    }
  }, [busy, editorRef, applyText]);

  const handleTranslate = useCallback(async () => {
    if (busy || !editorRef.current) return;
    const html = await editorRef.current.getHTML();
    const text = htmlToText(html);
    if (!text.trim()) {
      Alert.alert('提示', '编辑器内容为空，无法翻译');
      return;
    }
    setBusy('translate');
    try {
      const result = await translateText(text, undefined, '英文');
      if (result == null) {
        Alert.alert('提示', '请先配置 AI API Key（设置 → AI 服务）');
      } else {
        await applyText(result);
      }
    } catch {
      Alert.alert('翻译失败', '请检查网络后重试');
    } finally {
      setBusy(null);
    }
  }, [busy, editorRef, applyText]);

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <TouchableOpacity style={styles.action} onPress={handlePolish} disabled={busy !== null}>
        {busy === 'polish' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.actionText, { color: colors.primary }]}>✨ 润色全文</Text>
        )}
      </TouchableOpacity>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <TouchableOpacity style={styles.action} onPress={handleTranslate} disabled={busy !== null}>
        {busy === 'translate' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.actionText, { color: colors.primary }]}>🌐 翻译成英文</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
  },
});
