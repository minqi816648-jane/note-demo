import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset, useBottomInset } from '../src/hooks/useSafeArea';
import { useAsyncData } from '../src/hooks/useAsyncData';
import { EmptyState, InlineError } from '../src/components/common';
import { CategoryIcon } from '../src/components/common/CategoryIcon';
import { NoteService, confirmNoteClassification, CategoryService } from '../services';
import { formatDate } from '../src/utils/date';
import type { Note, Category } from '../src/constants/theme';

export default function PendingClassificationScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();
  const {
    data,
    loading: isLoading,
    error,
    load,
  } = useAsyncData<Note[]>(NoteService.getPendingClassificationNotes, {
    auto: true,
  });

  const notes = data ?? [];
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // 分类候选
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    CategoryService.getSystemCategories().then(setCategories).catch(() => {});
  }, []);

  // 解析 AI 标签
  const getAITags = useCallback((note: Note): string[] => {
    if (!note.ai_tags) return [];
    try {
      return JSON.parse(note.ai_tags);
    } catch {
      return [];
    }
  }, []);

  // 确认当前 AI 结果
  const handleConfirm = useCallback(
    async (note: Note) => {
      setConfirmingId(note.id);
      try {
        await confirmNoteClassification(note.id, note.category_id, getAITags(note));
        setEditingId(null);
        await load();
      } catch (error) {
        Alert.alert('确认失败', (error as Error).message);
      } finally {
        setConfirmingId(null);
      }
    },
    [load, getAITags]
  );

  // ===== 分类/标签修改编辑器 =====
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const startEdit = useCallback(
    (note: Note) => {
      setEditCategoryId(note.category_id);
      setEditTags(getAITags(note));
      setNewTag('');
      setEditingId(note.id);
    },
    [getAITags]
  );

  const addTag = useCallback(() => {
    const t = newTag.trim();
    if (t && !editTags.includes(t)) {
      setEditTags((prev) => [...prev, t]);
    }
    setNewTag('');
  }, [newTag, editTags]);

  const removeTag = useCallback((tag: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // 以用户修改后的分类/标签确认
  const handleSaveEdit = useCallback(
    async (note: Note) => {
      setConfirmingId(note.id);
      try {
        await confirmNoteClassification(note.id, editCategoryId, editTags);
        setEditingId(null);
        await load();
      } catch (error) {
        Alert.alert('确认失败', (error as Error).message);
      } finally {
        setConfirmingId(null);
      }
    },
    [load, editCategoryId, editTags]
  );

  // 打开编辑修改
  const handleEdit = useCallback(
    (noteId: string) => {
      router.push(`/note/${noteId}/edit`);
    },
    [router]
  );

  // 全部已完成处理
  const handleConfirmAll = useCallback(async () => {
    setConfirmingId('__all__');
    try {
      for (const note of notes) {
        await confirmNoteClassification(note.id, note.category_id, getAITags(note));
      }
      setEditingId(null);
      await load();
    } catch (error) {
      Alert.alert('操作失败', (error as Error).message);
    } finally {
      setConfirmingId(null);
    }
  }, [notes, load, getAITags]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>待确认分类</Text>
        {notes.length > 0 ? (
          <TouchableOpacity onPress={handleConfirmAll} style={styles.headerButton} disabled={confirmingId !== null}>
            <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: fontWeight.semiBold }]}>
              全部确认
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : error && notes.length === 0 ? (
        <InlineError message={error} onRetry={load} />
      ) : notes.length === 0 ? (
        <EmptyState
          icon="✅"
          title="没有待确认的分类"
          description="AI 分类的结果都会先经过你的确认"
          style={styles.emptyState}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.m + bottomInset }]}
          renderItem={({ item }) => {
            const tags = getAITags(item);
            const isEditing = editingId === item.id;
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.cardInfo} onPress={() => handleEdit(item.id)} activeOpacity={0.7}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.title || '无标题笔记'}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    更新于 {formatDate(item.updated_at)}
                  </Text>
                  <Text style={[styles.cardTags, { color: colors.textPrimary }]}>
                    {tags.length > 0 ? `🏷️ ${tags.join('、')}` : '（未生成标签）'}
                  </Text>
                  {item.ai_summary ? (
                    <Text style={[styles.cardSummary, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.ai_summary}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {isEditing && (
                  <View style={styles.editor}>
                    {/* 分类单选 */}
                    <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>分类</Text>
                    <View style={styles.chipsWrap}>
                      {categories.map((cat) => {
                        const active = editCategoryId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.chip,
                              active && { backgroundColor: colors.primary, borderColor: colors.primary },
                              { borderColor: colors.border },
                            ]}
                            onPress={() => setEditCategoryId(active ? null : cat.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.chipInner}>
                              <CategoryIcon category={cat} size={15} color={active ? '#FFF' : colors.textPrimary} />
                              <Text style={[styles.chipText, { color: active ? '#FFF' : colors.textPrimary, marginLeft: 5 }]}>
                                {cat.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* 标签多选 */}
                    <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>标签</Text>
                    <View style={styles.chipsWrap}>
                      {editTags.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}
                          onPress={() => removeTag(tag)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, { color: colors.textPrimary }]}>#{tag} ✕</Text>
                        </TouchableOpacity>
                      ))}
                      <View style={[styles.tagInputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        <TextInput
                          style={[styles.tagInput, { color: colors.textPrimary }]}
                          placeholder="+ 加标签"
                          placeholderTextColor={colors.textDisabled}
                          value={newTag}
                          onChangeText={setNewTag}
                          onSubmitEditing={addTag}
                          returnKeyType="done"
                        />
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.cardActions}>
                  {isEditing ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.card }]}
                        onPress={() => setEditingId(null)}
                        disabled={confirmingId === item.id}
                      >
                        <Text style={[styles.actionBtnTextEdit, { color: colors.textSecondary }]}>取消</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleSaveEdit(item)}
                        disabled={confirmingId === item.id}
                      >
                        {confirmingId === item.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.actionBtnText}>保存并确认</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleConfirm(item)}
                        disabled={confirmingId === item.id}
                      >
                        {confirmingId === item.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.actionBtnText}>确认</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.card }]}
                        onPress={() => startEdit(item)}
                      >
                        <Text style={[styles.actionBtnTextEdit, { color: colors.primary }]}>修改</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
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
  emptyState: {
    paddingTop: 80,
  },
  listContent: {
    padding: spacing.m,
  },
  card: {
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  cardInfo: {
    marginBottom: spacing.s,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: fontSize.small,
    marginBottom: 2,
  },
  cardTags: {
    fontSize: fontSize.caption,
    marginBottom: 2,
  },
  cardSummary: {
    fontSize: fontSize.small,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  editor: {
    marginBottom: spacing.s,
  },
  editorLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    marginTop: spacing.s,
    marginBottom: spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  tagInputRow: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
  },
  tagInput: {
    minWidth: 70,
    fontSize: fontSize.caption,
    paddingVertical: 4,
  },
  actionBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    minWidth: 72,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  actionBtnTextEdit: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
