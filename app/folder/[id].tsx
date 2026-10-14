import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, fontSize, fontWeight } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { NoteListView } from '../../src/components/note/NoteListView';
import { ConfirmDialog } from '../../src/components/common';
import { useNoteStore } from '../../stores/noteStore';
import { FolderService } from '../../services';
import type { Folder } from '../../src/constants/theme';

/**
 * 文件夹笔记列表页
 */
export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const { folders, fetchFolders, deleteFolder } = useNoteStore();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 加载文件夹信息
  useEffect(() => {
    fetchFolders();
    if (id) {
      FolderService.getFolderById(id).then(setFolder);
    }
  }, [id, fetchFolders]);

  // 删除文件夹
  const handleDeleteFolder = useCallback(() => {
    if (!folder) return;
    setShowDeleteConfirm(true);
  }, [folder]);

  const confirmDelete = useCallback(async () => {
    if (!folder) return;
    try {
      await deleteFolder(folder.id);
      router.back();
    } catch {
      setShowDeleteConfirm(false);
    }
  }, [folder, deleteFolder, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {folder?.icon ? `${folder.icon} ` : '📁 '}{folder?.name || '文件夹'}
        </Text>

        <TouchableOpacity onPress={handleDeleteFolder} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.danger }]}>删除</Text>
        </TouchableOpacity>
      </View>

      {/* 文件夹内笔记列表 */}
      <NoteListView folderId={id} />

      <ConfirmDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        iconName="trash"
        danger
        title="删除文件夹"
        message={`确定要删除「${folder?.name || ''}」吗？文件夹内的笔记也会被删除。`}
        confirmLabel="删除"
        onConfirm={confirmDelete}
      />
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
});
