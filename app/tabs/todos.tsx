import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, fontSize, fontWeight, fontFamily } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { AuroraBackground } from '../../src/components/common';
import { TodoListView } from '../../src/components/todo/TodoListView';
import { ProgressRing } from '../../src/components/todo/ProgressRing';
import { useTodoStore } from '../../stores/todoStore';

type TodoFilter = 'today' | 'urgent' | 'upcoming' | 'completed' | 'all';

const filters: { value: TodoFilter; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'urgent', label: '加急' },
  { value: 'upcoming', label: '近7天' },
  { value: 'all', label: '收集箱' },
];

// 今日日期子标题，如「8月5日」
function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function TodosScreen() {
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const [filter, setFilter] = useState<TodoFilter>('today');
  const todos = useTodoStore((s) => s.todos);

  // 当前视图完成比例（供夜间进度环展示）
  const total = todos.length;
  const done = useMemo(() => todos.filter((t) => t.status === 'completed').length, [todos]);
  const progress = total > 0 ? done / total : 0;

  return (
    <AuroraBackground style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部题头：今日三事 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        {isDark && (
          <ProgressRing
            progress={progress}
            color={colors.auroraCyan}
            trackColor={colors.border}
            textColor={colors.textPrimary}
            label={`${done}/${total}`}
          />
        )}
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>今日三事</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {total === 0 ? `${todayLabel()} · 还没有待办` : `${todayLabel()} · 已完成 ${done}/${total}`}
          </Text>
        </View>
      </View>

      {/* 筛选标签 */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.value ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.value ? '#FFF' : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 待办列表 */}
      <TodoListView filter={filter} />
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTextWrap: {
    marginLeft: spacing.m,
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: fontWeight.heavy,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    letterSpacing: 1,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.s,
  },
  filterChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});

