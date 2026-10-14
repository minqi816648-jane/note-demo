import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { calGrid } from '../../theme';
import { fontSize, fontWeight } from '../../theme';

interface InkDotsProps {
  count: number;
}

/**
 * 墨点密度：按笔记数渲染 1~4 枚墨点 + 数字角标。
 * 0 笔不渲染；>5 笔显示一簇墨点 + 数字 count。
 * 日间：焦墨渐变点；夜间：极光渐变点。
 */
export function InkDots({ count }: InkDotsProps) {
  const { colors, isDark } = useTheme();

  if (!count || count <= 0) return null;

  let dots = count;
  if (count === 1) dots = 1;
  else if (count === 2) dots = 2;
  else dots = Math.min(4, count);

  return (
    <View style={styles.wrap}>
      <View style={styles.cluster}>
        {Array.from({ length: dots }).map((_, i) => (
          <View key={i} style={[styles.dot, isDark ? styles.dotNight : styles.dotLight]} />
        ))}
      </View>
      {count > 5 && (
        <Text style={[styles.count, { color: colors.primary }]}>{count}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 3,
  },
  cluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    maxWidth: 28,
  },
  dot: {
    width: calGrid.dotMd,
    height: calGrid.dotMd,
    borderRadius: calGrid.dotMd / 2,
  },
  dotLight: {
    backgroundColor: '#3A362E',
  },
  dotNight: {
    backgroundColor: '#8B7CFF',
  },
  count: {
    fontSize: 9,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
});
