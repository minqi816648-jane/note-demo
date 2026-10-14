import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { Button } from './Button';

interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

/**
 * 统一的错误提示 + 重试组件。
 * 配合 useAsyncData 使用，或直接传入错误信息与重试回调。
 */
export function InlineError({ message = '加载失败，请稍后重试', onRetry, style, compact = false }: InlineErrorProps) {
  const { colors } = useTheme();

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        <Text style={[styles.compactText, { color: colors.textSecondary }]} numberOfLines={2}>
          {message}
        </Text>
        {onRetry && (
          <Button title="重试" variant="outline" size="small" onPress={onRetry} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>加载失败</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={4}>
        {message}
      </Text>
      {onRetry && (
        <View style={styles.action}>
          <Button title="重新加载" onPress={onRetry} />
        </View>
      )}
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
  icon: {
    fontSize: 40,
    marginBottom: spacing.s,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.s,
  },
  message: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginBottom: spacing.l,
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.s,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
  },
  compactText: {
    flex: 1,
    fontSize: fontSize.caption,
    marginRight: spacing.m,
  },
});
