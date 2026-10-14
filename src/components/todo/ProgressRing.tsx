import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressRingProps {
  progress: number; // 0 ~ 1
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  textColor: string;
  label?: string;
}

/**
 * 纯 RN 环形进度（无 SVG 依赖）。
 * 原理：底层灰色圆环轨道 + 两个半环遮罩，按 progress 旋转露出彩色弧。
 * 用于待办「今日三事」头部完成比例。
 */
export function ProgressRing({
  progress,
  size = 54,
  strokeWidth = 6,
  color,
  trackColor,
  textColor,
  label,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const half = (size - strokeWidth) / 2;

  // 左半环覆盖的角度：0~180° 对应 progress 0~0.5；右半环同理映射到 180~360°
  // 用 Two half circles, each rotates up to 180deg.
  // leftHalf shows arc from 90°..270°; rightHalf shows 0°..180° style.
  const rightDeg = Math.min(clamped * 2, 1) * 180; // 0..180
  const leftDeg = Math.max(clamped * 2 - 1, 0) * 180; // 0..180

  return (
    <View style={{ width: size, height: size }}>
      {/* 轨道 */}
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* 右半弧 */}
      <View style={[styles.halfBase, { width: size / 2, height: size, top: 0, left: size / 2, overflow: 'hidden' }]}>
        <View
          style={[
            styles.halfRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderRightColor: 'transparent',
              transform: [{ rotate: `${rightDeg}deg` }],
              left: -(size / 2),
            },
          ]}
        />
      </View>

      {/* 左半弧（翻转后旋转，覆盖 180~360°） */}
      <View style={[styles.halfBase, { width: size / 2, height: size, top: 0, left: 0, overflow: 'hidden' }]}>
        <View
          style={[
            styles.halfRingInverted,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderRightColor: 'transparent',
              transform: [{ rotate: `${leftDeg}deg` }],
              left: 0,
            },
          ]}
        />
      </View>

      {/* 中心文本 */}
      <View style={styles.center}>
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  halfBase: {
    position: 'absolute',
  },
  halfRing: {
    borderLeftColor: 'transparent',
  },
  halfRingInverted: {
    borderLeftColor: 'transparent',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
});
