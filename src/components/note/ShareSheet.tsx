import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { useBottomInset } from '../../hooks/useSafeArea';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Note } from '../../constants/theme';
import { formatDateTime } from '../../utils/date';

interface ShareSheetProps {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
}

/**
 * 分享与导出面板（Bottom Sheet）：生成长图/导出 MD/导出 PDF/复制链接
 */
export function ShareSheet({ visible, note, onClose }: ShareSheetProps) {
  const { colors, isDark } = useTheme();
  const bottomInset = useBottomInset();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const getSummary = useCallback((): string => {
    if (!note) return '';
    return (
      note.ai_summary ||
      (note.content_text ? (note.content_text.length > 90 ? `${note.content_text.slice(0, 90)}...` : note.content_text) : '')
    );
  }, [note]);

  const getFullText = useCallback((): string => {
    if (!note) return '';
    return [note.title, note.content_text].filter(Boolean).join('\n\n') || '无标题笔记';
  }, [note]);

  // 敏感笔记导出/分享需二次确认（隐私承诺：默认不让其内容离开本机）
  const runIfAllowed = useCallback(
    (action: () => void | Promise<void>) => {
      if (!note) return;
      if (note.is_sensitive === 1) {
        Alert.alert(
          '敏感笔记',
          '这是一篇敏感笔记。导出/分享会让内容离开本机，确定要继续吗？',
          [
            { text: '取消', style: 'cancel' },
            { text: '仍要导出', style: 'destructive', onPress: () => void action() },
          ]
        );
        return;
      }
      void action();
    },
    [note]
  );

  // 导出为 .md 文件并调起分享
  const exportMarkdown = useCallback(async () => {
    if (!note) return;
    setBusy('md');
    try {
      const safeName = (note.title || '导出').replace(/[\\/:*?"<>|]/g, '_');
      const dir = new Directory(Paths.document, 'exports');
      if (!dir.exists) dir.create({ intermediates: true, overwrite: true });
      const file = new File(dir, `${safeName}.md`);
      file.write(`# ${note.title || '无标题笔记'}\n\n${note.content_text || ''}\n\n---\nnote-demo · ${formatDateTime(note.updated_at)}\n`);
      await shareFile(file.uri, 'text/markdown', note.title || '导出 Markdown');
    } catch (e) {
      Alert.alert('导出失败', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [note]);

  // 导出为 .txt 文件（无后端时的 PDF 替代导出）
  const exportFile = useCallback(
    async (label: string) => {
      if (!note) return;
      setBusy(label);
      try {
        const ext = label === 'pdf' ? 'txt' : 'md';
        const safeName = (note.title || '导出').replace(/[\\/:*?"<>|]/g, '_');
        const dir = new Directory(Paths.document, 'exports');
        if (!dir.exists) dir.create({ intermediates: true, overwrite: true });
        const file = new File(dir, `${safeName}.${ext}`);
        file.write(getFullText());
        await shareFile(file.uri, textMime(ext), `${safeName}.${ext}`);
      } catch (e) {
        Alert.alert('导出失败', (e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [note, getFullText]
  );

  // 复制分享链接（本地 app 无后端，复制笔记 ID 引用）
  const copyLink = useCallback(async () => {
    if (!note) return;
    try {
      const clip = await import('expo-clipboard');
      await clip.setStringAsync(`note-demo://note/${note.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      Alert.alert('复制失败', (e as Error).message);
    }
  }, [note]);

  const shareNoteText = useCallback(async () => {
    if (!note) return;
    setBusy('card');
    try {
      await shareFileText(getFullText());
    } catch (e) {
      Alert.alert('分享失败', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [note, getFullText]);

  async function shareFile(uri: string, mime: string, title: string) {
    const ok = await Sharing.isAvailableAsync();
    if (!ok) {
      Alert.alert('提示', '当前设备不支持分享');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: title });
  }

  async function shareFileText(text: string) {
    const ok = await Sharing.isAvailableAsync();
    if (!ok) {
      Alert.alert('提示', '当前设备不支持分享');
      return;
    }
    await Sharing.shareAsync(text, { mimeType: 'text/plain', dialogTitle: note?.title || '分享笔记' });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mask} onPress={onClose} activeOpacity={1} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.sheetBg,
            borderTopColor: colors.border,
            paddingBottom: spacing.m + bottomInset,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: isDark ? colors.border : '#D8CDB6' }]} />

        {/* 头部 */}
        <View style={styles.header}>
          <View style={[styles.seal, { backgroundColor: colors.primary }]}>
            <Text style={styles.sealText}>享</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>分享与导出</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              将这篇笔记以你喜欢的方式传递出去
            </Text>
          </View>
        </View>

        {/* 长图卡预览 */}
        <View style={[styles.inkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.inkTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {note?.title || '无标题笔记'}
          </Text>
          <Text style={[styles.inkSummary, { color: colors.textSecondary }]} numberOfLines={3}>
            {getSummary()}
          </Text>
          <Text style={[styles.inkMeta, { color: colors.textDisabled }]}>
            note-demo · {note ? formatDateTime(note.updated_at) : ''}
          </Text>
        </View>

        {/* 操作区 */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { borderColor: colors.border }]}
            onPress={() => runIfAllowed(shareNoteText)}
            disabled={busy !== null}
            activeOpacity={0.7}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textPrimary }]}>
              {busy === 'card' ? '处理中...' : '🖼️ 生成长图 · 保存到相册'}
            </Text>
          </TouchableOpacity>

          <View style={styles.exportGrid}>
            <ExportCard
              icon="📄"
              label={busy === 'pdf' ? '导出中...' : '导出 PDF'}
              onPress={() => runIfAllowed(() => exportFile('pdf'))}
              disabled={busy !== null}
              colors={colors}
            />
            <ExportCard
              icon="📝"
              label={busy === 'md' ? '导出中...' : '导出 Markdown'}
              onPress={() => runIfAllowed(exportMarkdown)}
              disabled={busy !== null}
              colors={colors}
            />
          </View>

          {/* 分享链接 */}
          <View style={[styles.linkRow, { backgroundColor: colors.shareLinkBg }]}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>
              {note ? `note-demo://note/${note.id}` : ''}
            </Text>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: colors.copyBtnBg }]}
              onPress={copyLink}
              activeOpacity={0.7}
            >
              <Text style={[styles.copyBtnText, { color: isDark ? '#0A0D1F' : '#FFFFFF' }]}>
                {copied ? '已复制' : '复制'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function textMime(ext: string): string {
  return ext === 'md' ? 'text/markdown' : 'text/plain';
}

function ExportCard({
  icon,
  label,
  onPress,
  disabled,
  colors,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.exportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={[styles.exportIcon, { backgroundColor: colors.toolIconBg }]}>
        <Text style={styles.exportIconText}>{icon}</Text>
      </View>
      <Text style={[styles.exportLabel, { color: colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.m,
  },
  seal: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  sealText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  inkCard: {
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.m,
  },
  inkTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  inkSummary: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    marginBottom: spacing.s,
  },
  inkMeta: {
    fontSize: fontSize.small,
  },
  actions: {
    gap: spacing.s,
  },
  primaryBtn: {
    height: 44,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  exportGrid: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  exportCard: {
    flex: 1,
    height: 70,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportIconText: { fontSize: 14 },
  exportLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingLeft: spacing.m,
    height: 40,
    marginTop: spacing.xs,
  },
  linkText: {
    flex: 1,
    fontSize: fontSize.caption,
  },
  copyBtn: {
    height: 32,
    paddingHorizontal: spacing.m,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  copyBtnText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
  },
});
