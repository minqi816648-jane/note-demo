import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { ProgressBar } from './ProgressBar';
import { useBottomInset } from '../../hooks/useSafeArea';

interface StorageCardProps {
  used: number; // 字节
  total: number; // 字节
  cacheSize: number; // 可清理字节
  onClearCache?: () => void;
}

function fmt(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

/** 存储信息展示卡片（含进度条 + 清理动作） */
export function StorageCard({ used, total, cacheSize, onClearCache }: StorageCardProps) {
  const { colors, isDark } = useTheme();
  const bottomInset = useBottomInset();
  const progress = total > 0 ? used / total : 0;
  const low = used > 0 && progress >= 0.9;

  return (
    <View style={{ marginHorizontal: spacing.m }}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: spacing.m + Math.max(0, bottomInset - spacing.s),
          },
        ]}
      >
        <Text style={[styles.header, { color: colors.textPrimary }]}>
          已用 {fmt(used)} / {fmt(total)}
        </Text>
        <ProgressBar progress={progress} />
        <TouchableOpacity onPress={onClearCache} disabled={cacheSize <= 0} activeOpacity={0.7} style={styles.actionRow}>
          <Text
            style={[
              styles.action,
              { color: low ? colors.danger : colors.primary },
              cacheSize <= 0 && { opacity: 0.4 },
            ]}
          >
            清理缓存 · 可释放 {fmt(cacheSize)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.l,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
  },
  header: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.s,
  },
  actionRow: {
    marginTop: spacing.s,
  },
  action: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
});
