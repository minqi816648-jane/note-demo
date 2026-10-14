import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';
import { NoteIcon } from './NoteIcon';
import type { NoteIconName } from './NoteIcon';

interface ExampleItem {
  label: string;
  onPress: () => void;
}

export type EmptyStateVariant = 'hero' | 'muted';
export type EmptyStateIconType = 'static' | 'seal';

export interface EmptyStateAction {
  label: string;
  variant?: 'primary' | 'outline';
  onClick: () => void;
}

interface EmptyStateProps {
  /** 品牌引导(A-整页) / 轻量无匹配(B-筛选) */
  variant?: EmptyStateVariant;
  /** static=线性图标 / seal=朱砂印章（hero 可用） */
  iconType?: EmptyStateIconType;
  /** 图标为 emoji 时传入 */
  icon?: string;
  /** 图标为主题线标时传入（优先于 icon） */
  iconName?: NoteIconName;
  /** seal（印章）内的字，如「记」「待」 */
  sealText?: string;
  title: string;
  description?: string;
  /** 引导句（次要文字，如「点下方 + 记一件」） */
  caption?: string;
  /** 示例提问/操作胶囊列表（AI 页用） */
  examples?: ExampleItem[];
  /** CTA 胶囊列表（primary=实心 / outline=描边） */
  actions?: EmptyStateAction[];
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * 通用空态组件（§5.1 EmptyState）
 * 结构：图标/印章 → 主文案 → 引导句 → 示例胶囊（可选）→ CTA（可选）
 * 支持双态：hero=品牌引导（A-整页零内容）/ muted=轻量无匹配（B-筛选空）。
 * 颜色走主题令牌：日 焦墨/淡墨，夜 雾白/夜灰；图标强调 日朱砂/夜极光青。
 */
export function EmptyState({
  variant = 'hero',
  iconType = 'static',
  icon = '📝',
  iconName,
  sealText = '记',
  title,
  description,
  caption,
  examples,
  actions,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { colors, isDark } = useTheme();
  const isMuted = variant === 'muted';
  const primaryBg = isDark ? '#8FE7F5' : '#1C1B18';
  const primaryText = isDark ? '#0A0D1F' : '#F6F1E6';

  const ctaActions: EmptyStateAction[] =
    actions && actions.length > 0
      ? actions
      : actionLabel && onAction
      ? [{ label: actionLabel, variant: 'primary', onClick: onAction }]
      : [];

  return (
    <View style={[styles.container, isMuted && styles.containerMuted, style]}>
      {/* 图标 / 印章 */}
      {iconName ? (
        <View
          style={[
            styles.iconBadge,
            isMuted && styles.iconBadgeMuted,
            iconType === 'seal' && !isMuted
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { borderColor: colors.primary },
          ]}
        >
          {iconType === 'seal' && !isMuted ? (
            <Text style={styles.sealText}>{sealText}</Text>
          ) : (
            <NoteIcon
              name={iconName}
              size={isMuted ? 20 : 26}
              color={isMuted ? colors.textSecondary : colors.primary}
            />
          )}
        </View>
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}

      {/* 主文案 */}
      <Text
        style={[
          styles.title,
          isMuted && styles.titleMuted,
          { color: colors.textPrimary, fontFamily: fontFamily.serif },
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}

      {/* 引导句 */}
      {caption ? (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text>
      ) : null}

      {/* 示例胶囊 */}
      {examples && examples.length > 0 ? (
        <View style={styles.examplesWrap}>
          {examples.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.exampleChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={ex.onPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.exampleText, { color: colors.textPrimary }]}>{ex.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* CTA */}
      {ctaActions.length > 0 ? (
        <View style={styles.actions}>
          {ctaActions.map((act, i) =>
            act.variant === 'outline' ? (
              <TouchableOpacity
                key={i}
                style={[styles.ctaOutline, { borderColor: colors.border }]}
                onPress={act.onClick}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.ctaOutlineText, { color: colors.textPrimary }]}>{act.label}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={i}
                style={[styles.ctaPrimary, { backgroundColor: primaryBg }]}
                onPress={act.onClick}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={act.label}
              >
                <Text style={[styles.ctaPrimaryText, { color: primaryText }]}>{act.label}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  containerMuted: {
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.m,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  iconBadgeMuted: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.25,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  sealText: {
    color: '#F6F1E6',
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '900',
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.heavy,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  titleMuted: {
    fontSize: fontSize.body,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.body,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  caption: {
    fontSize: fontSize.small,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  examplesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.s,
    marginTop: spacing.m,
    paddingHorizontal: spacing.m,
  },
  exampleChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: 99,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exampleText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  ctaPrimary: {
    minWidth: 140,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 2,
    borderRadius: radius.full,
    backgroundColor: '#1C1B18',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 3,
  },
  ctaPrimaryText: {
    color: '#F6F1E6',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  ctaOutline: {
    minWidth: 140,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaOutlineText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
});
