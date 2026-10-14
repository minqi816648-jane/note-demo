import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { TodoService } from '../../services';
import { searchNotes } from '../../services';
import { NoteIcon } from '../../src/components/common/NoteIcon';
import { EmptyState, ConfirmDialog } from '../../src/components/common';
import type { TodoPriority } from '../../src/constants/theme';

// 通知服务触发原生模块(expo-notifications)，Expo Go（SDK53+）不支持远程推送，
// 若静态 import 会在页面加载时抛错。动态按需加载，失败时静默降级。
async function loadNotifier(): Promise<typeof import('../../services/notification.service') | null> {
  try {
    return await import('../../services/notification.service');
  } catch {
    return null;
  }
}

const PRIORITY_OPTIONS: { value: TodoPriority; label: string; urgent: boolean }[] = [
  { value: 1, label: '普通', urgent: false },
  { value: 2, label: '急·今天', urgent: true },
  { value: 3, label: '加急', urgent: true },
];

export default function TodoDetailScreen() {
  const { id, title: seedTitle } = useLocalSearchParams<{ id?: string; title?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();

  const isNew = !id || id === 'new' || id === 'undefined';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(() => {
    const raw = seedTitle || '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  });
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(1);
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');
  const [dueDate, setDueDate] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 提醒：remindAt 存 ISO 字符串；remindDate 为可编辑的 Date
  const [remindAt, setRemindAt] = useState('');
  const [remindDate, setRemindDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const remindLabel = useMemo(() => {
    if (!remindDate) return '';
    const d = remindDate;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [remindDate]);

  // 加载
  useEffect(() => {
    if (isNew) return;
    TodoService.getTodoById(id).then((todo) => {
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description || '');
        setPriority(todo.priority);
        setStatus(todo.status === 'completed' ? 'completed' : 'pending');
        setDueDate(todo.due_date || '');
        setRemindAt(todo.remind_at || '');
        if (todo.remind_at) {
          const d = new Date(todo.remind_at);
          if (!isNaN(d.getTime())) setRemindDate(d);
        }
        setNoteId(todo.note_id);
        if (todo.note_id) {
          TodoService.getLinkedNoteTitle(todo.note_id).then(setNoteTitle).catch(() => {});
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, isNew]);

  // 关联笔记选择器
  const [noteQ, setNoteQ] = useState('');
  const [noteResults, setNoteResults] = useState<Awaited<ReturnType<typeof searchNotes>>>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleNoteSearch = useCallback(async () => {
    const q = noteQ.trim();
    if (!q) { setNoteResults([]); return; }
    setNoteResults(await searchNotes(q, undefined, 10));
  }, [noteQ]);

  const pickNote = useCallback((n: Awaited<ReturnType<typeof searchNotes>>[number]) => {
    setNoteId(n.note_id ?? null);
    setNoteTitle(n.title);
    setPickerVisible(false);
    setNoteQ('');
  }, []);

  const handleToggle = useCallback(() => {
    setStatus((s) => (s === 'completed' ? 'pending' : 'completed'));
  }, []);

  const handleDelete = useCallback(() => {
    if (isNew) return;
    setShowDeleteConfirm(true);
  }, [isNew]);

  const confirmDelete = useCallback(async () => {
    if (isNew) return;
    try {
      await TodoService.softDeleteTodo(id);
      const notifier = await loadNotifier();
      await notifier?.clearTodoReminderNotification(id).catch(() => {});
      router.back();
    } catch {
      setShowDeleteConfirm(false);
    }
  }, [id, isNew, router]);

  // 日期/时间选择
  const onDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setRemindDate((prev) => {
        const base = prev ? new Date(prev) : new Date();
        base.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return base;
      });
      if (Platform.OS === 'android') setShowTimePicker(true);
    }
  }, []);

  const onTimeChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setRemindDate((prev) => {
        const base = prev ? new Date(prev) : new Date();
        base.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return base;
      });
    }
  }, []);

  const clearReminder = useCallback(() => {
    setRemindDate(null);
    setRemindAt('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入待办标题');
      return;
    }

    // 校验提醒时间有效性：仅当设置了且晚于当前时间才视为有效；过期提醒不落库
    let validRemindAt: string | null = null;
    const hasReminder = remindDate != null && !isNaN(remindDate.getTime());
    if (hasReminder) {
      if (remindDate!.getTime() > Date.now()) {
        validRemindAt = remindDate!.toISOString();
      } else {
        Alert.alert('提示', '提醒时间已过去，提醒将被清除。请重新设置一个未来时间，或保存为无提醒。');
        setRemindDate(null);
      }
    }

    setSaving(true);
    try {
      let todoId: string = id ?? '';
      const remindPayload = validRemindAt;
      if (isNew) {
        const created = await TodoService.createTodo({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_date: dueDate || null,
          remind_at: remindPayload,
          note_id: noteId,
          status,
        });
        todoId = created.id;
      } else {
        await TodoService.updateTodo(id, {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          due_date: dueDate || null,
          remind_at: remindPayload,
          note_id: noteId,
        });
      }

      // 同步系统提醒：仅对有效（未来）时间排期；否则清除既有提醒（Expo Go 下静默降级）
      const notifier = await loadNotifier();
      if (validRemindAt) {
        await notifier?.setTodoReminder(todoId, title.trim(), remindDate!).catch(() => {});
      } else {
        await notifier?.clearTodoReminderNotification(todoId).catch(() => {});
      }

      router.back();
    } catch (e) {
      Alert.alert('保存失败', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [isNew, id, title, description, priority, dueDate, remindDate, noteId, status, router]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  const isCompleted = status === 'completed';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <NoteIcon name="left" size={16} />
          <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>返回</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isNew ? '新建待办' : '待办详情'}
        </Text>
        {!isNew ? (
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <NoteIcon name="trash" size={16} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* 主卡片 */}
      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* 标题 + 完成 */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                {
                  borderColor: isCompleted ? colors.primary : colors.border,
                  backgroundColor: isCompleted ? colors.primary : 'transparent',
                },
              ]}
              onPress={handleToggle}
              activeOpacity={0.8}
            >
              {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <TextInput
              style={[styles.titleInput, { color: colors.textPrimary }, isCompleted && styles.titleCompleted]}
              placeholder="输入待办标题..."
              placeholderTextColor={colors.textDisabled}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              autoFocus={isNew}
            />
          </View>

          {/* 描述 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>描述</Text>
          <TextInput
            style={[styles.descInput, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="补充说明，例如截止时间、关键事项…"
            placeholderTextColor={colors.textDisabled}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* 优先级 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>优先级</Text>
          <View style={styles.priorityRow}>
            {PRIORITY_OPTIONS.map((opt) => {
              const active = priority === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.priorityChip,
                    { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
                  ]}
                  onPress={() => setPriority(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.priorityText, { color: active ? '#FFF' : colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                  {active && opt.urgent && (
                    <View style={[styles.urgentSeal, { backgroundColor: colors.auroraPink }]}>
                      <Text style={styles.urgentSealText}>急</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 提醒 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>提醒</Text>
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <NoteIcon name="todoadd" size={16} color={colors.primary} />
            <TouchableOpacity
              style={styles.infoTouch}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.infoText, { color: remindDate ? colors.textPrimary : colors.textSecondary }]}>
                {remindDate ? `提醒 · ${remindLabel}` : '设置提醒时间（系统通知）'}
              </Text>
            </TouchableOpacity>
            {remindDate && (
              <TouchableOpacity onPress={clearReminder} activeOpacity={0.7} accessibilityLabel="清除提醒">
                <Text style={[styles.clearRemind, { color: colors.danger }]}>清除</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 日期/时间选择器 */}
          {showDatePicker && (
            <DateTimePicker
              value={remindDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={remindDate ?? new Date()}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* 关联笔记 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>关联笔记</Text>
          <TouchableOpacity
            style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              if (noteId) {
                router.push(`/note/${noteId}`);
              } else {
                setPickerVisible(true);
              }
            }}
            activeOpacity={0.8}
          >
            <NoteIcon name="clip" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoText, { color: colors.textPrimary }]} numberOfLines={1}>
                {noteTitle || (noteId ? '关联笔记' : '关联一篇笔记')}
              </Text>
              {noteId ? (
                <Text style={[styles.infoSub, { color: colors.textSecondary }]}>点击跳转查看</Text>
              ) : null}
            </View>
            <NoteIcon name="more" size={14} color={colors.textDisabled} />
          </TouchableOpacity>

          {!isNew && (
            <View style={[styles.aiBar, { borderColor: colors.gold, backgroundColor: colors.gold + '1a' }]}>
              <Text style={styles.aiIcon}>✨</Text>
              <Text style={[styles.aiText, { color: colors.textPrimary }]}>更新时间为 {new Date(new Date().toISOString()).toLocaleString()}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 保存 */}
      <View style={[styles.saveWrap, { paddingBottom: spacing.m }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.saveText, { fontFamily: fontFamily.serif }]}>保存待办</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 关联笔记选择器 */}
      {pickerVisible && (
        <View style={styles.pickerMask}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>选择要关联的笔记</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <NoteIcon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <TextInput
                style={[styles.pickerInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="搜索笔记..."
                placeholderTextColor={colors.textDisabled}
                value={noteQ}
                onChangeText={setNoteQ}
                onSubmitEditing={handleNoteSearch}
              />
              <TouchableOpacity style={[styles.pickerGo, { backgroundColor: colors.primary }]} onPress={handleNoteSearch}>
                <Text style={styles.pickerGoText}>搜索</Text>
              </TouchableOpacity>
            </View>
            {noteResults.length === 0 ? (
              <EmptyState icon="📝" title="搜索要关联的笔记" description="输入关键词查找" style={{ paddingVertical: 24 }} />
            ) : (
              noteResults.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => pickNote(n)}
                >
                  <Text style={[styles.pickerItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{n.title}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        iconName="trash"
        danger
        title="删除待办"
        message={`确定删除「${title || '无标题'}」吗？`}
        confirmLabel="删除"
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  headerBtnText: { fontSize: fontSize.body },
  headerTitle: { fontSize: fontSize.subtitle, fontWeight: fontWeight.semiBold },
  body: { flex: 1, padding: spacing.m },
  card: {
    borderRadius: radius.l,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.m,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#FFF', fontWeight: 'bold' },
  titleInput: {
    flex: 1,
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    paddingVertical: 0,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B83A2A',
    opacity: 0.55,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    marginTop: spacing.m,
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  descInput: {
    minHeight: 80,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    fontSize: fontSize.caption,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  priorityChip: {
    flex: 1,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  priorityText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  urgentSeal: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    transform: [{ rotate: '-3deg' }],
  },
  urgentSealText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoText: { fontSize: fontSize.caption, flex: 1 },
  infoTouch: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  clearRemind: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  infoSub: { fontSize: fontSize.small, marginTop: 1 },
  aiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.m,
    padding: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  aiIcon: { fontSize: fontSize.caption },
  aiText: { fontSize: fontSize.small, flex: 1 },
  saveWrap: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  saveBtn: {
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  saveText: { color: '#FFF', fontSize: fontSize.body, fontWeight: '700', letterSpacing: 2 },
  pickerMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    paddingBottom: spacing.xxl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  pickerTitle: { fontSize: fontSize.subtitle, fontWeight: fontWeight.semiBold },
  pickerSearch: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.s },
  pickerInput: {
    flex: 1,
    height: 40,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    fontSize: fontSize.caption,
  },
  pickerGo: {
    paddingHorizontal: spacing.m,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  pickerGoText: { color: '#FFF', fontSize: fontSize.caption, fontWeight: '500' },
  pickerItem: {
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemTitle: { fontSize: fontSize.body },
});
