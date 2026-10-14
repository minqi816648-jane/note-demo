import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, fontWeight, fontFamily } from '../../theme';

interface MonthNavProps {
  year: number;
  month: number; // 0-11
  onPrev: () => void;
  onNext: () => void;
}

/**
 * 月头区：◀ 上月 / 2026年8月 / 下月 ▶（卷轴语义）
 */
export function MonthNav({ year, month, onPrev, onNext }: MonthNavProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onPrev} style={styles.btn} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[styles.arrow, { color: colors.textPrimary }]}>◀</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
        {year}年{month + 1}月
      </Text>

      <TouchableOpacity onPress={onNext} style={styles.btn} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[styles.arrow, { color: colors.textPrimary }]}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  btn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 14,
  },
  title: {
    fontWeight: fontWeight.bold,
    fontSize: 16,
  },
});
