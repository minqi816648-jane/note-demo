import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { NoteIcon } from '../common/NoteIcon';
import { PressableScale } from '../common/PressableScale';
import type { NoteIconName } from '../common/NoteIcon';
import type { ReactNode } from 'react';

interface CardRowProps {
  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  right?: ReactNode;
  /** 是否显示右侧箭头（无自定义 right 时） */
  showArrow?: boolean;
}

/** 设置卡片行外壳：连续行首/尾圆角处理 */
export function CardRowShell({ onPress, disabled, children, right, showArrow = true }: CardRowProps) {
  const { colors } = useTheme();
  // 将「行布局」内聚到一个根 View，避免 PressableScale 内部 Animated.View
  // 层级改变 flexDirection 导致图标可见而文字宽度塌缩、呈现「无文字」。
  const rowContent = (
    <View style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.content}>{children}</View>
      {right || (showArrow ? <Text style={[styles.arrow, { color: colors.textDisabled }]}>›</Text> : null)}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} disabled={disabled}>
        {rowContent}
      </PressableScale>
    );
  }
  return rowContent;
}

/** 设置项行体：图标 + 标题/副标题 */
export function CardRowContent({
  icon,
  title,
  subtitle,
}: {
  icon?: NoteIconName;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.contentWrap}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '1a' }]}>
          <NoteIcon name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  subtitle: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    marginLeft: spacing.s,
  },
});
