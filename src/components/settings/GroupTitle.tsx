import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { fontSize, fontWeight, spacing } from '../../theme';

interface GroupTitleProps {
  title: string;
}

/** 设置分组标题（如「AI 服务」「数据」） */
export function GroupTitle({ title }: GroupTitleProps) {
  const { colors } = useTheme();
  return <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.5,
    marginTop: spacing.l,
    marginBottom: spacing.s,
    marginLeft: spacing.xs,
  },
});
