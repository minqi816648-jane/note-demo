import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize } from '../../theme';
import { countMediaBlocks, mediaStatsLabel } from '../../utils/mediaCards';

interface InsertStatsStripProps {
  /** 当前编辑器 HTML 内容（用于统计卡片） */
  html: string;
  /** 已附加、但尚未内嵌为卡片的文件附件数量（兜底） */
  filesCount?: number;
}

/**
 * 多媒体插入统计行 —— 见《note-demo-开发沟通文档4.0》6.2「已插入：图片1·链接1·附件1」
 */
export function InsertStatsStrip({ html, filesCount = 0 }: InsertStatsStripProps) {
  const { colors } = useTheme();

  const label = useMemo(() => {
    const stats = countMediaBlocks(html);
    stats.file += filesCount;
    stats.total += filesCount;
    return stats.total > 0 ? mediaStatsLabel(stats) : '';
  }, [html, filesCount]);

  if (!label) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.primary + '10' }]}>
      <Text style={[styles.dot, { color: colors.primary }]}>◈</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        已插入：{label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: spacing.m,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dot: {
    fontSize: fontSize.small,
    marginRight: 5,
  },
  text: {
    fontSize: fontSize.small,
  },
});
