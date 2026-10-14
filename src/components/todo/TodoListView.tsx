import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { useTodoStore } from '../../../stores/todoStore';
import { EmptyState, ConfirmDialog } from '../common';
import { searchNotes, TodoService, extractTodosFromText } from '../../../services';
import type { ExtractedTodo } from '../../../services/ai';
import type { Todo, TodoPriority } from '../../constants/theme';
import { formatDate } from '../../utils/date';
import type { SearchResultItem } from '../../../services';

// 通知服务触发原生模块(expo-notifications)，Expo Go 中不支持。
// 使用动态 import 按需加载；失败时降级（返回 null）。
async function loadNotifier(): Promise<typeof import('../../../services/notification.service') | null> {
  try {
    return await import('../../../services/notification.service');
  } catch {
    return null;
  }
}

type TodoFilter = 'today' | 'urgent' | 'upcoming' | 'completed' | 'all';

interface TodoListViewProps {
  filter?: TodoFilter;
}

const PRIORITIES: { value: TodoPriority; label: string }[] = [
  { value: 1, label: '普通' },
  { value: 2, label: '急·今天' },
  { value: 3, label: '加急' },
];

/**
 * 待办列表视图：支持添加、编辑、完成、删除，优先级与截止日期
 */
export function TodoListView({ filter = 'today' }: TodoListViewProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { todos, isLoading, error, fetchTodos, toggleTodo, deleteTodo, createTodo, updateTodo } = useTodoStore();

  const [showEditor, setShowEditor] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(2);
  const [dueDate, setDueDate] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string | null>(null);
  const [parentTodoId, setParentTodoId] = useState<string | null>(null);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteResults, setNoteResults] = useState<SearchResultItem[]>([]);

  // 底部速记条
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  // 删除待办确认目标（主题化弹窗）
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);

  // AI 提炼确认条
  const [showExtract, setShowExtract] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractCandidates, setExtractCandidates] = useState<ExtractedTodo[]>([]);
  const [checkedCandidates, setCheckedCandidates] = useState<boolean[]>([]);

  // 加载待办
  useEffect(() => {
    fetchTodos(filter);
  }, [filter, fetchTodos]);

  // 各页签空态文案（§5.3）
  const emptyTitle = filter === 'today' ? '今天还没有待办' : filter === 'urgent' ? '没有加急待办' : filter === 'upcoming' ? '近7天没有待办' : filter === 'completed' ? '没有已完成的待办' : '还没有待办';
  const emptyCaption = '点下方 ＋ 记一件';

  // 打开新建
  const openCreate = useCallback(() => {
    setEditingTodo(null);
    setTitle('');
    setDescription('');
    setPriority(2);
    setDueDate('');
    setRemindAt('');
    setNoteId(null);
    setNoteTitle(null);
    setParentTodoId(null);
    setShowEditor(true);
  }, []);

  // 打开编辑
  const openEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setPriority(toPriority(todo.priority));
    setDueDate(todo.due_date || '');
    setRemindAt(todo.remind_at || '');
    setNoteId(todo.note_id || null);
    setParentTodoId(todo.parent_todo_id || null);
    // 异步加载关联笔记标题
    if (todo.note_id) {
      TodoService.getLinkedNoteTitle(todo.note_id).then((t) => setNoteTitle(t ?? null));
    } else {
      setNoteTitle(null);
    }
    setShowEditor(true);
  }, []);

  // 笔记搜索（用于关联）
  const handleNoteSearch = useCallback(async () => {
    const q = noteSearch.trim();
    if (!q) {
      setNoteResults([]);
      return;
    }
    const res = await searchNotes(q, undefined, 10);
    setNoteResults(res);
  }, [noteSearch]);

  // 选择关联笔记
  const handlePickNote = useCallback((item: SearchResultItem) => {
    setNoteId(item.note_id || null);
    setNoteTitle(item.title);
    setShowNotePicker(false);
    setNoteSearch('');
    setNoteResults([]);
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('提示', '请输入待办内容');
      return;
    }
    const payload = {
      title: trimmedTitle,
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      remind_at: remindAt || null,
      note_id: noteId,
      parent_todo_id: parentTodoId,
    };
    let savedId: string;
    if (editingTodo) {
      await updateTodo(editingTodo.id, payload);
      savedId = editingTodo.id;
      const notifier = await loadNotifier();
      await notifier?.clearTodoReminderNotification(savedId);
    } else {
      const created = await createTodo(payload);
      savedId = created.id;
    }

    // 设置本地通知提醒（Expo Go 不支持时静默降级）
    if (remindAt) {
      const date = new Date(remindAt);
      if (!isNaN(date.getTime())) {
        const notifier = await loadNotifier();
        if (notifier) {
          await notifier.setTodoReminder(savedId, trimmedTitle, date);
        }
      }
    }

    setShowEditor(false);
  }, [title, description, priority, dueDate, remindAt, noteId, parentTodoId, editingTodo, createTodo, updateTodo]);

  // 底部速记：回车即建待办
  const handleQuickAdd = useCallback(async () => {
    const t = quickTitle.trim();
    if (!t || quickSaving) return;
    setQuickSaving(true);
    try {
      await createTodo({ title: t });
      setQuickTitle('');
      Alert.alert('已添加');
    } catch (error) {
      Alert.alert('添加失败', (error as Error).message);
    } finally {
      setQuickSaving(false);
    }
  }, [quickTitle, quickSaving, createTodo]);

  // AI 提炼：从文本提取待办候选
  const handleExtract = useCallback(async () => {
    const t = extractText.trim();
    if (!t || extracting) return;
    setExtracting(true);
    try {
      const items = await extractTodosFromText(t);
      if (!items || items.length === 0) {
        Alert.alert('未提取到', '从这段文本中没有识别到待办事项');
        setExtractCandidates([]);
        return;
      }
      setExtractCandidates(items);
      setCheckedCandidates(items.map(() => true));
    } catch (error) {
      Alert.alert('提取失败', '请先配置 AI API Key（设置 → AI 服务）');
    } finally {
      setExtracting(false);
    }
  }, [extractText, extracting]);

  // 确认勾选的待办并批量创建
  const handleConfirmExtract = useCallback(async () => {
    const chosen = extractCandidates.filter((_, i) => checkedCandidates[i]);
    if (chosen.length === 0) return;
    try {
      for (const item of chosen) {
        await createTodo({
          title: item.title,
          description: item.description || null,
          priority: item.priority ?? 2,
          due_date: item.dueDate || null,
          source: 'ai_extract',
        });
      }
      Alert.alert('已添加', `已添加到待办 ${chosen.length} 条`);
      setExtractCandidates([]);
      setCheckedCandidates([]);
      setShowExtract(false);
      setExtractText('');
    } catch (error) {
      Alert.alert('添加失败', (error as Error).message);
    }
  }, [extractCandidates, checkedCandidates, createTodo]);

  // 删除待办（主题化确认弹窗）
  const handleDeleteTodo = useCallback(
    (todo: Todo) => {
      setDeleteTarget(todo);
    },
    []
  );

  const confirmDeleteTodo = useCallback(() => {
    if (deleteTarget) {
      deleteTodo(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteTodo]);

  // 获取优先级颜色
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

  // 获取优先级标签
  const getPriorityLabel = useCallback(
    (p: number): string => {
      switch (p) {
        case 1: return '普通';
        case 2: return '急';
        case 3: return '加急';
        default: return '普通';
      }
    },
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* AI 提炼入口 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.addTodoBar, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowExtract(true)}
        >
          <Text style={[styles.addTodoIcon, { color: colors.primary }]}>✨</Text>
          <Text style={[styles.addTodoText, { color: colors.textSecondary }]}>AI 提炼待办</Text>
        </TouchableOpacity>
      </View>

      {/* AI 提炼确认条 */}
      {extractCandidates.length > 0 && (
        <View style={[styles.extractBanner, { borderColor: colors.primary, backgroundColor: colors.card }]}>
          <Text style={[styles.extractBannerTitle, { color: colors.textPrimary }]}>
            问墨从文本中提炼出 <Text style={[styles.extractBannerAccent, { color: colors.primary }]}>{extractCandidates.length}</Text> 条待办
          </Text>
          {extractCandidates.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={styles.extractRow}
              onPress={() =>
                setCheckedCandidates((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
              }
              activeOpacity={0.7}
            >
              <View style={[styles.extractCheck, { borderColor: colors.primary, backgroundColor: checkedCandidates[i] ? colors.primary : 'transparent' }]}>
                {checkedCandidates[i] && <Text style={styles.extractCheckMark}>✓</Text>}
              </View>
              <Text style={[styles.extractRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {c.title}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.extractConfirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirmExtract}
          >
            <Text style={styles.extractConfirmText}>加入待办</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 待办列表 */}
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TodoRow
            todo={item}
            colors={colors}
            isDark={isDark}
            onToggle={toggleTodo}
            onPress={() => router.push(`/todo/${item.id}`)}
            onDelete={() => handleDeleteTodo(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
            </View>
          ) : (
            <EmptyState
              iconName="check"
              title={emptyTitle}
              caption={emptyCaption}
            />
          )
        }
      />

      {/* 底部常驻速记条（定稿） */}
      <View style={[styles.quickBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.quickInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="记下一件事…"
          placeholderTextColor={colors.textDisabled}
          value={quickTitle}
          onChangeText={setQuickTitle}
          onSubmitEditing={() => {
            const t = quickTitle.trim();
            router.push(t ? `/todo/new?title=${encodeURIComponent(t)}` : '/todo/new');
            setQuickTitle('');
          }}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            const t = quickTitle.trim();
            router.push(t ? `/todo/new?title=${encodeURIComponent(t)}` : '/todo/new');
            setQuickTitle('');
          }}
          disabled={quickSaving}
          activeOpacity={0.7}
        >
          <Text style={styles.quickAddIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* 错误提示 */}
      {error && (
        <View style={[styles.errorToast, { backgroundColor: colors.error }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 编辑器 */}
      <Modal visible={showEditor} transparent animationType="slide" onRequestClose={() => setShowEditor(false)}>
        <TouchableOpacity style={styles.modalMask} onPress={() => setShowEditor(false)} activeOpacity={1} />
        <View style={[styles.editorSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.editorHeader}>
            <Text style={[styles.editorTitle, { color: colors.textPrimary }]}>
              {editingTodo ? '编辑待办' : '新建待办'}
            </Text>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <Text style={[styles.editorClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.editorScroll}
          >
          <Text style={[styles.label, { color: colors.textSecondary }]}>内容</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="待办内容"
            placeholderTextColor={colors.textDisabled}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>描述</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="备注（可选）"
            placeholderTextColor={colors.textDisabled}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>优先级</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityChip,
                  {
                    backgroundColor: priority === p.value ? getPriorityColor(p.value) : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    { color: priority === p.value ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>截止日期（可选，YYYY-MM-DD）</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="例如 2026-08-05"
            placeholderTextColor={colors.textDisabled}
            value={dueDate}
            onChangeText={setDueDate}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>提醒时间（可选）</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="例如 2026-08-05T09:00:00"
            placeholderTextColor={colors.textDisabled}
            value={remindAt}
            onChangeText={setRemindAt}
            autoCapitalize="none"
          />

          {/* 关联笔记 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>关联笔记</Text>
          <View style={styles.linkRow}>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowNotePicker(true)}
            >
              <Text style={[styles.linkButtonText, { color: noteId ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
                {noteId ? `📎 ${noteTitle || '关联笔记'}` : '选择关联笔记（可选）'}
              </Text>
            </TouchableOpacity>
            {noteId && (
              <TouchableOpacity
                style={styles.linkClear}
                onPress={() => { setNoteId(null); setNoteTitle(null); }}
              >
                <Text style={[styles.linkClearText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 父任务 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>作为子任务</Text>
          <View style={styles.linkRow}>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() =>
                Alert.alert('选择父任务', '', [
                  { text: '不挂载（顶级）', onPress: () => setParentTodoId(null) },
                  ...todos
                    .filter((t) => t.id !== (editingTodo?.id ?? '') && t.parent_todo_id !== (editingTodo?.id ?? ''))
                    .map((t) => ({
                      text: t.title.length > 20 ? t.title.slice(0, 20) + '…' : t.title,
                      onPress: () => setParentTodoId(t.id),
                    })),
                  { text: '取消', style: 'cancel' },
                ])
              }
            >
              <Text style={[styles.linkButtonText, { color: parentTodoId ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
                {parentTodoId
                  ? `📌 ${todos.find((t) => t.id === parentTodoId)?.title || '父任务'}`
                  : '选择父任务（可选）'}
              </Text>
            </TouchableOpacity>
            {parentTodoId && (
              <TouchableOpacity
                style={styles.linkClear}
                onPress={() => setParentTodoId(null)}
              >
                <Text style={[styles.linkClearText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* AI 提炼输入弹层 */}
      <Modal visible={showExtract} transparent animationType="slide" onRequestClose={() => setShowExtract(false)}>
        <TouchableOpacity style={styles.modalMask} onPress={() => setShowExtract(false)} activeOpacity={1} />
        <View style={[styles.extractSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.editorHeader}>
            <Text style={[styles.editorTitle, { color: colors.textPrimary }]}>✨ 提炼待办</Text>
            <TouchableOpacity onPress={() => setShowExtract(false)}>
              <Text style={[styles.editorClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.extractHint, { color: colors.textSecondary }]}>
            粘贴笔记或会议文本，问墨会自动识别待办事项
          </Text>
          <TextInput
            style={[styles.extractTextInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="例如：下周完成项目立项书，周五回复张教授邮件…"
            placeholderTextColor={colors.textDisabled}
            value={extractText}
            onChangeText={setExtractText}
            multiline
            maxLength={6000}
          />
          <TouchableOpacity
            style={[styles.extractGoBtn, { backgroundColor: colors.primary }]}
            onPress={handleExtract}
            disabled={extracting || !extractText.trim()}
            activeOpacity={0.7}
          >
            {extracting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.extractGoText}>开始提炼</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 笔记关联选择器 */}
      <Modal visible={showNotePicker} transparent animationType="slide" onRequestClose={() => setShowNotePicker(false)}>
        <TouchableOpacity style={styles.modalMask} onPress={() => setShowNotePicker(false)} activeOpacity={1} />
        <View style={[styles.notePickerSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.editorHeader}>
            <Text style={[styles.editorTitle, { color: colors.textPrimary }]}>选择笔记</Text>
            <TouchableOpacity onPress={() => setShowNotePicker(false)}>
              <Text style={[styles.editorClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noteSearchRow}>
            <TextInput
              style={[styles.noteSearchInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="搜索笔记..."
              placeholderTextColor={colors.textDisabled}
              value={noteSearch}
              onChangeText={(t) => { setNoteSearch(t); }}
              onSubmitEditing={handleNoteSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.noteSearchBtn, { backgroundColor: colors.primary }]}
              onPress={handleNoteSearch}
            >
              <Text style={styles.noteSearchBtnText}>搜索</Text>
            </TouchableOpacity>
          </View>

          {noteResults.length === 0 ? (
            <Text style={[styles.notePickerEmpty, { color: colors.textDisabled }]}>
              输入关键词搜索要关联的笔记
            </Text>
          ) : (
            noteResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.noteResultItem, { borderBottomColor: colors.border }]}
                onPress={() => handlePickNote(item)}
              >
                <Text style={[styles.noteResultTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.snippet ? (
                  <Text style={[styles.noteResultSnippet, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.snippet}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modal>

      {/* 删除待办确认（主题化弹窗） */}
      <ConfirmDialog
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        sealText="删"
        danger
        title="删除待办"
        message={deleteTarget ? `确定要删除「${deleteTarget.title}」吗？` : undefined}
        confirmLabel="删除"
        onConfirm={confirmDeleteTodo}
      />
    </View>
  );
}

function toPriority(p: number): TodoPriority {
  if (p === 1 || p === 3) return p;
  return 2;
}

interface TodoRowProps {
  todo: Todo;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark?: boolean;
  onToggle: (id: string) => void;
  onPress: (todo: Todo) => void;
  onDelete: () => void;
}

/**
 * 待办行（今日三事风格）
 * 完成时朱砂笔锋勾选动效 + 朱砂划(line-through)；优先级 1 显示"急"签
 */
function TodoRow({ todo, colors, isDark = false, onToggle, onPress, onDelete }: TodoRowProps) {
  const isCompleted = todo.status === 'completed';
  const progress = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isCompleted ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [isCompleted, progress]);

  const checkScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const checkOpacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  const titleStyle = isCompleted ? 'line-through' : 'none';
  const titleColor = isCompleted ? colors.textDisabled : colors.textPrimary;
  const isUrgent = todo.priority === 2 || todo.priority === 3;

  return (
    <View style={[styles.todoItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 完成状态（朱砂笔锋勾） */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: isCompleted ? colors.primary : colors.border,
            backgroundColor: isCompleted ? colors.primary : colors.transparent,
          },
        ]}
        onPress={() => onToggle(todo.id)}
        activeOpacity={0.7}
      >
        <Animated.Text
          style={[
            styles.checkmark,
            {
              color: '#FFF',
              opacity: checkOpacity,
              transform: [{ scale: checkScale }],
            },
          ]}
        >
          ✓
        </Animated.Text>
      </TouchableOpacity>

      {/* 待办内容 */}
      <TouchableOpacity style={styles.todoContent} onPress={() => onPress(todo)} activeOpacity={0.7}>
        <Text
          style={[
            styles.todoTitle,
            { color: titleColor, textDecorationLine: titleStyle, textDecorationColor: colors.primary },
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>

        {/* 元信息 */}
        <View style={styles.todoMeta}>
          {todo.due_date && (
            <Text style={[styles.todoDate, { color: colors.textSecondary }]}>
              📅 {formatDate(todo.due_date)}
            </Text>
          )}

          {isUrgent && (
            <View
              style={[
                styles.urgentTag,
                isDark
                  ? { backgroundColor: colors.auroraPink, borderRadius: 99 }
                  : { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.urgentTagText}>急</Text>
            </View>
          )}

          {todo.remind_at ? <Text style={styles.descIcon}>🔔</Text> : null}
          {todo.note_id ? <Text style={styles.descIcon}>📎</Text> : null}
          {todo.parent_todo_id ? <Text style={styles.descIcon}>📌</Text> : null}
          {todo.description ? <Text style={styles.descIcon}>📝</Text> : null}
        </View>
      </TouchableOpacity>

      {/* 删除 */}
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={[styles.deleteIcon, { color: colors.textDisabled }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addTodoBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    gap: spacing.s,
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  extractBtnIcon: {
    fontSize: fontSize.caption,
    marginRight: spacing.xs,
  },
  extractBtnText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  extractBanner: {
    marginHorizontal: spacing.m,
    marginTop: spacing.s,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
  },
  extractBannerTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.s,
  },
  extractBannerAccent: {
    fontWeight: fontWeight.bold,
  },
  extractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  extractCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
  },
  extractCheckMark: {
    color: '#FFF',
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  extractRowTitle: {
    flex: 1,
    fontSize: fontSize.body,
  },
  extractConfirmBtn: {
    marginTop: spacing.s,
    borderRadius: radius.full,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  extractConfirmText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  extractSheet: {
    padding: spacing.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
  },
  extractHint: {
    fontSize: fontSize.small,
    marginBottom: spacing.s,
  },
  extractTextInput: {
    minHeight: 90,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    fontSize: fontSize.body,
    textAlignVertical: 'top',
  },
  extractGoBtn: {
    marginTop: spacing.m,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  extractGoText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.m,
  },
  quickInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    fontSize: fontSize.body,
    marginRight: spacing.s,
  },
  quickAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddIcon: {
    color: '#FFF',
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
  },
  addTodoIcon: {
    fontSize: fontSize.subtitle,
    marginRight: spacing.s,
  },
  addTodoText: {
    fontSize: fontSize.body,
  },
  listContent: {
    padding: spacing.m,
    flexGrow: 1,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  todoContent: {
    flex: 1,
    marginRight: spacing.s,
  },
  todoTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
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
    marginRight: spacing.s,
  },
  priorityText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  urgentTag: {
    paddingHorizontal: spacing.s,
    paddingVertical: 1,
    marginRight: spacing.s,
    transform: [{ rotate: '-4deg' }],
  },
  urgentTagText: {
    color: '#FFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  descIcon: {
    fontSize: fontSize.small,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteIcon: {
    fontSize: fontSize.caption,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.body,
  },
  errorToast: {
    position: 'absolute',
    top: 8,
    left: spacing.m,
    right: spacing.m,
    padding: spacing.s,
    borderRadius: radius.s,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  editorSheet: {
    padding: spacing.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    maxHeight: '85%',
  },
  editorScroll: {
    flexGrow: 0,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  editorTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  editorClose: {
    fontSize: fontSize.subtitle,
    padding: spacing.xs,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.s,
  },
  input: {
    minHeight: 42,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    fontSize: fontSize.body,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  priorityChip: {
    flex: 1,
    height: 36,
    borderRadius: radius.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  priorityChipText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    marginTop: spacing.l,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkButtonText: {
    fontSize: fontSize.body,
  },
  linkClear: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginLeft: spacing.xs,
  },
  linkClearText: {
    fontSize: fontSize.subtitle,
  },
  notePickerSheet: {
    padding: spacing.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    minHeight: 320,
  },
  noteSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  noteSearchInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    fontSize: fontSize.body,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteSearchBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    marginLeft: spacing.s,
  },
  noteSearchBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  notePickerEmpty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    fontSize: fontSize.body,
  },
  noteResultItem: {
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noteResultTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  noteResultSnippet: {
    fontSize: fontSize.small,
  },
});
