import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0 ~ 1
  height?: number;
}

/** 进度条 */
export function ProgressBar({ progress, height = 4 }: ProgressBarProps) {
  const { colors, isDark } = useTheme();
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: colors.border }]}>
      <View
        style={[
          styles.fill,
          {
            height,
            width: `${p * 100}%`,
            backgroundColor: isDark ? colors.auroraCyan : colors.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 99,
  },
});
