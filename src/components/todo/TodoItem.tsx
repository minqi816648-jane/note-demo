import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import type { Todo } from '../../constants/theme';
import { formatDate } from '../../utils/date';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onPress?: (todo: Todo) => void;
  onLongPress?: (todo: Todo) => void;
}

/**
 * 待办事项组件
 */
export function TodoItem({ todo, onToggle, onPress, onLongPress }: TodoItemProps) {
  const { colors } = useTheme();
  const isCompleted = todo.status === 'completed';

  // 完成时笔锋勾选动效（淡入缩放）
  const check = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(check, {
      toValue: isCompleted ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isCompleted, check]);

  // 优先级颜色
  const priorityColors: Record<number, string> = {
    1: colors.success,
    2: colors.warning,
    3: colors.danger,
  };

  // 优先级标签
  const priorityLabels: Record<number, string> = {
    1: '普通',
    2: '急',
    3: '加急',
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: isCompleted ? 0.6 : 1,
        },
      ]}
      onPress={() => onPress?.(todo)}
      onLongPress={() => onLongPress?.(todo)}
      activeOpacity={0.7}
    >
      {/* 完成状态 */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: isCompleted ? colors.success : colors.border,
            backgroundColor: isCompleted ? colors.success : colors.transparent,
          },
        ]}
        onPress={() => onToggle(todo.id)}
      >
        {isCompleted && (
          <Animated.Text
            style={[
              styles.checkmark,
              {
                opacity: check,
                transform: [
                  {
                    scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
                  },
                ],
              },
            ]}
          >
            ✓
          </Animated.Text>
        )}
      </TouchableOpacity>

      {/* 待办内容 */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>

        {todo.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {todo.description}
          </Text>
        )}

        {/* 元信息 */}
        <View style={styles.metaRow}>
          {todo.priority !== 1 && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityColors[todo.priority] + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityColors[todo.priority] }]}>
                {priorityLabels[todo.priority]}
              </Text>
            </View>
          )}

          {todo.due_date && (
            <View style={styles.dueDate}>
              <Text style={[styles.dueDateText, { color: colors.textSecondary }]}>
                📅 {formatDate(todo.due_date)}
              </Text>
            </View>
          )}

          {todo.note_id && (
            <View style={styles.noteLink}>
              <Text style={[styles.noteLinkText, { color: colors.primary }]}>📝</Text>
            </View>
          )}
        </View>
      </View>

      {/* 箭头 */}
      <Text style={[styles.chevron, { color: colors.textDisabled }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
    marginRight: spacing.s,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  description: {
    fontSize: fontSize.caption,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.s,
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
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: fontSize.small,
  },
  noteLink: {
    marginLeft: 'auto',
  },
  noteLinkText: {
    fontSize: fontSize.caption,
  },
  chevron: {
    fontSize: 20,
    marginLeft: spacing.xs,
  },
});