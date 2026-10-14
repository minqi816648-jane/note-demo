import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';
import type { RichTextEditorRef } from '../editor/RichTextEditor';
import { continueText, polishText, translateText } from '../../../services';
import { htmlToText } from '../../utils/html';

type BusyAction = 'continue' | 'polish' | 'translate' | null;

interface AskInkButtonProps {
  editorRef: React.RefObject<RichTextEditorRef | null>;
  onContentChanged?: (html: string) => void;
}

/**
 * 问墨 AI 浮钮：选中/输入正文时浮出于编辑区，点开「续写 / 润色 / 翻译」面板
 * —— 见《note-demo-开发沟通文档4.0》4.1
 */
export function AskInkButton({ editorRef, onContentChanged }: AskInkButtonProps) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);

  const applyText = useCallback(
    async (text: string) => {
      if (!editorRef.current) return;
      const html = text
        .split(/\n+/)
        .map((line) => `<p>${line.trim()}</p>`)
        .join('');
      editorRef.current.setHTML(html);
      onContentChanged?.(html);
    },
    [editorRef, onContentChanged]
  );

  const runAction = useCallback(
    async (kind: Exclude<BusyAction, null>) => {
      if (busy) return;
      const hasText = await editorRef.current?.getHTML();
      const text = htmlToText(hasText || '');
      if (!text.trim()) {
        Alert.alert('提示', '编辑器内容为空，暂无法使用该功能');
        return;
      }
      setOpen(false);
      setBusy(kind);
      try {
        let result: string | null = null;
        if (kind === 'continue') result = await continueText(text);
        else if (kind === 'polish') result = await polishText(text);
        else result = await translateText(text, undefined, '英文');

        if (result == null) {
          Alert.alert('提示', '请先配置 AI API Key（设置 → AI 服务）');
        } else {
          await applyText(result);
        }
      } catch {
        Alert.alert(
          kind === 'translate' ? '翻译失败' : kind === 'polish' ? '润色失败' : '续写失败',
          '请检查网络后重试'
        );
      } finally {
        setBusy(null);
      }
    },
    [busy, editorRef, applyText]
  );

  const panelBg = isDark ? 'rgba(13,17,34,0.96)' : '#FFFDF7';
  const border = isDark ? 'rgba(255,255,255,0.14)' : '#E5DCC8';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* 展开面板 */}
      {open && (
        <View style={[styles.panel, { backgroundColor: panelBg, borderColor: border }]}>
          <TouchableOpacity
            style={styles.panelRow}
            onPress={() => runAction('continue')}
            disabled={busy !== null}
            activeOpacity={0.7}
          >
            {busy === 'continue' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.panelText, { color: colors.textPrimary }]}>续写</Text>
            )}
          </TouchableOpacity>
          <View style={[styles.panelDivider, { backgroundColor: border }]} />
          <TouchableOpacity
            style={styles.panelRow}
            onPress={() => runAction('polish')}
            disabled={busy !== null}
            activeOpacity={0.7}
          >
            {busy === 'polish' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.panelText, { color: colors.textPrimary }]}>润色</Text>
            )}
          </TouchableOpacity>
          <View style={[styles.panelDivider, { backgroundColor: border }]} />
          <TouchableOpacity
            style={styles.panelRow}
            onPress={() => runAction('translate')}
            disabled={busy !== null}
            activeOpacity={0.7}
          >
            {busy === 'translate' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.panelText, { color: colors.textPrimary }]}>翻译</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 问墨浮钮 */}
      <TouchableOpacity
        style={[
          styles.button,
          open
            ? { backgroundColor: colors.primary }
            : { backgroundColor: isDark ? colors.primary : '#1C1B18' },
        ]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.85}
      >
        <Text style={[styles.buttonText, { color: '#FFF' }]}>问墨</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: spacing.m,
    bottom: 8,
    alignItems: 'flex-end',
    zIndex: 20,
    elevation: 20,
  },
  button: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.l,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    letterSpacing: 4,
  },
  panel: {
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  panelRow: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.l,
  },
  panelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
