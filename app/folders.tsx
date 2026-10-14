import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset, useBottomInset } from '../src/hooks/useSafeArea';
import { useNoteStore } from '../stores/noteStore';
import { EmptyState, ConfirmDialog } from '../src/components/common';
import { NoteIcon } from '../src/components/common/NoteIcon';
import type { Folder } from '../src/constants/theme';

/**
 * 文件夹管理页面
 * 支持创建、重命名、删除文件夹
 */
export default function FoldersScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();
  const { folders, fetchFolders, createFolder, updateFolder, deleteFolder } = useNoteStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmFolder, setConfirmFolder] = useState<Folder | null>(null);

  // 加载文件夹
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // 顶层文件夹
  const rootFolders = folders.filter((f) => f.parent_id === null && f.deleted_at === null);

  // 添加文件夹
  const handleAddFolder = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createFolder({ name });
      setNewName('');
      setIsAdding(false);
    } catch (error) {
      Alert.alert('创建失败', (error as Error).message);
    }
  }, [newName, createFolder]);

  // 开始编辑
  const handleStartEdit = useCallback((folder: Folder) => {
    setEditingFolder(folder);
    setEditName(folder.name);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    const name = editName.trim();
    if (!editingFolder) return;
    if (!name) return;
    try {
      await updateFolder(editingFolder.id, { name });
      setEditingFolder(null);
      setEditName('');
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
    }
  }, [editName, editingFolder, updateFolder]);

  // 删除文件夹
  const handleDeleteFolder = useCallback(
    (folder: Folder) => {
      setConfirmFolder(folder);
    },
    []
  );

  const confirmDelete = useCallback(
    (folder: Folder) => {
      deleteFolder(folder.id);
      setConfirmFolder(null);
    },
    [deleteFolder]
  );

  const handlePress = useCallback(
    (folder: Folder) => {
      router.push(`/folder/${folder.id}`);
    },
    [router]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>文件夹</Text>

        <TouchableOpacity
          onPress={() => setIsAdding(!isAdding)}
          style={[styles.headerButton, { alignItems: 'flex-end' }]}
        >
          <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: fontWeight.semiBold }]}>
            {isAdding ? '取消' : '新建'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 新建文件夹输入 */}
      {isAdding && (
        <View style={[styles.addBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.addInput, { color: colors.textPrimary }]}
            placeholder="文件夹名称"
            placeholderTextColor={colors.textDisabled}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleAddFolder}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddFolder}
          >
            <Text style={styles.addButtonText}>创建</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 文件夹列表 */}
      <FlatList
        data={rootFolders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.m + bottomInset }]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.folderItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.folderIcon}>
              {item.icon ? (
                <Text style={styles.folderIconEmoji}>{item.icon}</Text>
              ) : (
                <NoteIcon name="folder" size={22} color={colors.primary} />
              )}
            </View>

            {editingFolder?.id === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.editInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  onSubmitEditing={handleSaveEdit}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleSaveEdit} style={styles.editDone}>
                  <NoteIcon name="check" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingFolder(null)} style={styles.editCancel}>
                  <NoteIcon name="close" size={20} color={colors.textDisabled} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.folderInfo}>
                <Text style={[styles.folderName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.note_count > 0 && (
                  <Text style={[styles.folderCount, { color: colors.textSecondary }]}>
                    {item.note_count} 篇笔记
                  </Text>
                )}
              </View>
            )}

            {editingFolder?.id !== item.id && (
              <View style={styles.folderActions}>
                <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.actionBtn}>
                  <NoteIcon name="edit" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteFolder(item)} style={styles.actionBtn}>
                  <NoteIcon name="trash" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            iconName="folder"
            title="还没有文件夹"
            description="点击右上角新建文件夹来整理笔记"
          />
        }
      />

      <ConfirmDialog
        visible={confirmFolder !== null}
        onClose={() => setConfirmFolder(null)}
        iconName="trash"
        danger
        title="删除文件夹"
        message={`确定要删除「${confirmFolder?.name || ''}」吗？文件夹内的笔记也会被删除。`}
        confirmLabel="删除"
        onConfirm={() => {
          const f = confirmFolder;
          if (!f) return;
          confirmDelete(f);
        }}
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
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    marginVertical: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addInput: {
    flex: 1,
    fontSize: fontSize.body,
    paddingVertical: spacing.xs,
  },
  addButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    marginLeft: spacing.s,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.m,
    flexGrow: 1,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  folderIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  folderIconEmoji: {
    fontSize: fontSize.subtitle,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  folderCount: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  folderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: spacing.s,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    fontSize: fontSize.body,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.s,
    marginRight: spacing.s,
  },
  editDone: {
    padding: spacing.s,
  },
  editCancel: {
    padding: spacing.s,
  },
});
