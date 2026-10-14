import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset, useBottomInset } from '../src/hooks/useSafeArea';
import { useAsyncData } from '../src/hooks/useAsyncData';
import { InlineError, EmptyState, ConfirmDialog } from '../src/components/common';
import { NoteService } from '../services';
import { clearNoteAttachments } from '../src/utils/noteAttachments';
import { formatDateTime } from '../src/utils/date';
import type { Note } from '../src/constants/theme';

/**
 * 回收站页面
 * 展示已软删除的笔记，支持恢复和彻底删除
 */
export default function TrashScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();
  const {
    data: deletedNotes,
    loading: isLoading,
    error,
    load: loadTrash,
  } = useAsyncData<Note[]>(() => NoteService.getDeletedNotes().then((n) => n), { auto: true });

  const notes = deletedNotes ?? [];

  // 通用确认弹窗状态
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // 恢复笔记
  const handleRestore = useCallback((note: Note) => {
    setConfirm({
      title: '恢复笔记',
      message: `确定要恢复「${note.title || '无标题'}」吗？`,
      confirmLabel: '恢复',
      onConfirm: async () => {
        await NoteService.restoreNote(note.id);
        loadTrash();
      },
    });
  }, [loadTrash]);

  // 彻底删除
  const handlePermanentDelete = useCallback((note: Note) => {
    setConfirm({
      title: '彻底删除',
      message: `确定要永久删除「${note.title || '无标题'}」吗？此操作不可恢复！`,
      danger: true,
      confirmLabel: '彻底删除',
      onConfirm: async () => {
        await clearNoteAttachments(note.id);
        await NoteService.hardDeleteNote(note.id);
        loadTrash();
      },
    });
  }, [loadTrash]);

  // 清空回收站
  const handleClearAll = useCallback(() => {
    if (notes.length === 0) return;
    setConfirm({
      title: '清空回收站',
      message: `确定要永久删除全部 ${notes.length} 条笔记吗？此操作不可恢复！`,
      danger: true,
      confirmLabel: '清空',
      onConfirm: async () => {
        for (const note of notes) {
          await clearNoteAttachments(note.id);
          await NoteService.hardDeleteNote(note.id);
        }
        loadTrash();
      },
    });
  }, [notes, loadTrash]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>回收站</Text>

        {notes.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.danger }]}>清空</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 回收站列表 */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : error && notes.length === 0 ? (
        <InlineError message={error} onRetry={loadTrash} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.m + bottomInset }]}
          renderItem={({ item }) => (
            <View style={[styles.noteItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.noteInfo}>
                <Text style={[styles.noteTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.title || '无标题笔记'}
                </Text>
                <Text style={[styles.noteDate, { color: colors.textDisabled }]}>
                  删除于 {formatDateTime(item.deleted_at || item.updated_at)}
                </Text>
              </View>
              <View style={styles.noteActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                  onPress={() => handleRestore(item)}
                >
                  <Text style={[styles.actionText, { color: colors.success }]}>恢复</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.danger + '20' }]}
                  onPress={() => handlePermanentDelete(item)}
                >
                  <Text style={[styles.actionText, { color: colors.danger }]}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🗑️"
              title="回收站是空的"
              description="删除的笔记会出现在这里，可以恢复或彻底删除"
            />
          }
        />
      )}

      {/* 主题化确认弹窗 */}
      <ConfirmDialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        iconName="trash"
        danger={confirm?.danger}
        title={confirm?.title || ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || '确定'}
        onConfirm={() => {
          const c = confirm;
          if (!c) return;
          setConfirm(null);
          c.onConfirm();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
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
  listContent: {
    padding: spacing.m,
    flexGrow: 1,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  noteInfo: {
    flex: 1,
    marginRight: spacing.m,
  },
  noteTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  noteDate: {
    fontSize: fontSize.small,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    marginLeft: spacing.s,
  },
  actionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
