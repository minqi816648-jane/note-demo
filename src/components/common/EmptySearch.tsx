import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';

export type EmptySearchMode = 'all' | 'tag' | 'ai';

interface EmptySearchProps {
  query: string;
  mode: EmptySearchMode;
  onAISearch?: () => void;
  /** 是否可显示「让问墨语义搜索」CTA */
  aiEnabled?: boolean;
}

/** 各模式文案 */
function copyFor(mode: EmptySearchMode, query: string): string {
  if (mode === 'tag') return `没有「${query}」标签的笔记，换个标签试试`;
  if (mode === 'ai') return '未寻得相关笔记，将基于通用知识为你回答';
  return `没有与「${query}」匹配的笔记，换个说法试试`;
}

/**
 * 搜索零结果空状态：水墨插画（朱砂弧线+放大镜+椭圆阴影）+ 标题 + 副文案 + CTA
 */
export function EmptySearch({ query, mode, onAISearch, aiEnabled = true }: EmptySearchProps) {
  const { colors, isDark } = useTheme();
  const canCTA = mode !== 'ai' && aiEnabled;

  return (
    <View style={styles.wrap}>
      {/* 水墨插画（纯 RN 绘制） */}
      <View style={styles.illustration}>
        {/* 朱砂弧线 */}
        <View style={[styles.arc, { borderLeftColor: isDark ? '#FF7AD9' : colors.primary }]} />
        {/* 放大镜 */}
        <View style={[styles.glass, { borderColor: colors.textSecondary }]} />
        {/* 放大镜柄 */}
        <View style={[styles.glassHandle, { backgroundColor: colors.textSecondary }]} />
        {/* 底部椭圆阴影 */}
        <View style={[styles.shadow, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(138,130,114,0.15)' }]} />
      </View>

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
        未寻得墨迹
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{copyFor(mode, query)}</Text>

      {canCTA ? (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={onAISearch}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaIcon}>✨</Text>
          <Text style={styles.ctaText}>让问墨语义搜索</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    width: 120,
    height: 120,
    position: 'relative',
    marginBottom: spacing.l,
  },
  arc: {
    position: 'absolute',
    width: 60,
    height: 80,
    borderLeftWidth: 2.5,
    borderRadius: 50,
    borderBottomLeftRadius: 50,
    left: 20,
    top: 10,
    transform: [{ rotate: '-15deg' }],
  },
  glass: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderWidth: 2,
    borderRadius: 25,
    right: 12,
    top: 20,
  },
  glassHandle: {
    position: 'absolute',
    width: 14,
    height: 2.5,
    right: 12,
    top: 66,
    transform: [{ rotate: '45deg' }],
  },
  shadow: {
    position: 'absolute',
    width: 80,
    height: 12,
    borderRadius: 99,
    bottom: 4,
    left: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.s,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.l,
  },
  cta: {
    paddingHorizontal: spacing.l,
    height: 44,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
  },
  ctaIcon: {
    fontSize: fontSize.caption,
  },
  ctaText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});
