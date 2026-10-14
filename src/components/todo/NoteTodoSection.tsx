import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { TodoService, extractTodosFromText } from '../../../services';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Todo, TodoPriority } from '../../constants/theme';
import { formatDate } from '../../utils/date';

interface NoteTodoSectionProps {
  noteId: string;
  contentText?: string;
  /** 是否允许对正文发起 AI 提取（敏感笔记禁 AI，仅本地添加） */
  allowAI?: boolean;
}

/**
 * 笔记详情页的关联待办区：展示、新增、AI 提取、完成、删除与笔记关联的待办
 */
export function NoteTodoSection({ noteId, contentText = '', allowAI = true }: NoteTodoSectionProps) {
  const { colors } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);

  const load = useCallback(async () => {
    const list = await TodoService.getTodosByNoteId(noteId);
    setTodos(list);
  }, [noteId]);

  useEffect(() => {
    load();
  }, [load]);

  // AI 提取待办
  const handleExtract = useCallback(async () => {
    if (!allowAI || extracting) return;
    const text = (contentText || '').slice(0, 6000);
    if (!text.trim()) {
      Alert.alert('提示', '这篇笔记没有可提取的文本内容');
      return;
    }
    setExtracting(true);
    try {
      const items = await extractTodosFromText(text);
      if (!items || items.length === 0) {
        Alert.alert('未提取到', '从这篇笔记中没有提取到明确的待办事项');
        return;
      }
      for (const item of items) {
        await TodoService.createTodo({
          title: item.title,
          description: item.description || null,
          priority: item.priority ?? 2,
          due_date: item.dueDate || null,
          note_id: noteId,
          source: 'ai_extract',
        });
      }
      await load();
      Alert.alert('已提取', `已从笔记创建 ${items.length} 个待办`);
    } catch (error) {
      Alert.alert('提取失败', '请先配置 AI API Key（设置 → AI 服务）');
    } finally {
      setExtracting(false);
    }
  }, [extracting, contentText, noteId, load, allowAI]);

  const handleAdd = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    await TodoService.createTodo({ title: t, note_id: noteId });
    setTitle('');
    setEditing(false);
    load();
  }, [title, noteId, load]);

  const handleToggle = useCallback(async (todo: Todo) => {
    await TodoService.toggleTodo(todo.id);
    load();
  }, [load]);

  const handleDelete = useCallback(
    (todo: Todo) => {
      setDeleteTarget(todo);
    },
    []
  );

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      TodoService.softDeleteTodo(deleteTarget.id).then(load);
      setDeleteTarget(null);
    }
  }, [deleteTarget, load]);

  const getPriorityColor = useCallback(
    (p: number): string => {
      switch (p) {
        case 1: return colors.success;
        case 2: return colors.warning;
        case 3: return colors.danger;
        default: return colors.textSecondary;
      }
    },
    [colors]
  );

  const getPriorityLabel = useCallback((p: number): string => {
    switch (p) {
      case 1: return '普通';
      case 2: return '急';
      case 3: return '加急';
      default: return '普通';
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>📌 关联待办 ({todos.length})</Text>
        <View style={styles.headerActions}>
          {!editing && allowAI && (
            <TouchableOpacity onPress={handleExtract} disabled={extracting} style={styles.aiExtractBtn}>
              {extracting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.aiExtractText, { color: colors.primary }]}>✨ AI 提取</Text>
              )}
            </TouchableOpacity>
          )}
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={[styles.addBtn, { color: colors.primary }]}>＋ 添加</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {editing && (
        <View style={[styles.addRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.addInput, { color: colors.textPrimary }]}
            placeholder="新增待办"
            placeholderTextColor={colors.textDisabled}
            value={title}
            onChangeText={setTitle}
            autoFocus
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={[styles.addSubmit, { backgroundColor: colors.primary }]} onPress={handleAdd}>
            <Text style={styles.addSubmitText}>添加</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditing(false); setTitle(''); }}>
            <Text style={[styles.addCancel, { color: colors.textSecondary }]}>取消</Text>
          </TouchableOpacity>
        </View>
      )}

      {todos.map((todo) => (
        <View
          key={todo.id}
          style={[styles.todoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <TouchableOpacity
            style={[
              styles.checkbox,
              {
                borderColor: todo.status === 'completed' ? colors.success : colors.border,
                backgroundColor: todo.status === 'completed' ? colors.success : colors.transparent,
              },
            ]}
            onPress={() => handleToggle(todo)}
          >
            {todo.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <View style={styles.todoInfo}>
            <Text
              style={[
                styles.todoTitle,
                {
                  color: todo.status === 'completed' ? colors.textDisabled : colors.textPrimary,
                  textDecorationLine: todo.status === 'completed' ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={1}
            >
              {todo.title}
            </Text>
            <View style={styles.todoMeta}>
              {todo.due_date && (
                <Text style={[styles.todoDate, { color: colors.textSecondary }]}>
                  📅 {formatDate(todo.due_date)}
                </Text>
              )}
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(todo.priority) + '20' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(todo.priority) }]}>
                  {getPriorityLabel(todo.priority)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={() => handleDelete(todo)} style={styles.deleteBtn}>
            <Text style={[styles.deleteIcon, { color: colors.textDisabled }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* 删除待办确认（主题化弹窗） */}
      <ConfirmDialog
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        sealText="删"
        danger
        title="删除待办"
        message={deleteTarget ? `确定要删除「${deleteTarget.title}」吗？` : undefined}
        confirmLabel="删除"
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  title: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
  },
  addBtn: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  aiExtractBtn: {
    paddingVertical: 2,
  },
  aiExtractText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.s,
    padding: spacing.s,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  addInput: {
    flex: 1,
    fontSize: fontSize.body,
    paddingVertical: spacing.xs,
  },
  addSubmit: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    marginLeft: spacing.s,
  },
  addSubmitText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  addCancel: {
    paddingHorizontal: spacing.s,
    fontSize: fontSize.caption,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  todoInfo: {
    flex: 1,
    marginRight: spacing.s,
  },
  todoTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todoDate: {
    fontSize: fontSize.small,
    marginRight: spacing.s,
  },
  priorityBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
  },
  priorityText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  deleteIcon: {
    fontSize: fontSize.caption,
  },
});
