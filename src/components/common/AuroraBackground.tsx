import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** GPU 降级：低端机/性能受限时仅渲染静态光斑（不漂移） */
  staticBlobs?: boolean;
}

/**
 * 极光背景（夜间模式）
 * 夜间：深空底 + 2~3 个缓慢位移的极光光斑（青/紫/粉，半透明大圆近似高斯模糊）
 * 日间：纯透明（由页面自行提供宣纸背景）
 * 极光层位于最底，children 渲染在 z1，保证内容可点可读。
 *
 * 性能（GPU 降级）：
 *  - 光斑位移用 useNativeDriver:true（transform 交由 UI 线程/GPU，避免 JS 每帧重排）。
 *  - 系统开启 prefers-reduced-motion 时退化为静态光斑，不加动画。
 *  - staticBlobs=true 时同样退化为静态（供低端机/性能帧卡时页面主动调用）。
 */
export function AuroraBackground({ children, style, staticBlobs = false }: AuroraBackgroundProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();

  const animate = isDark && !reducedMotion && !staticBlobs;

  // 三个光斑的平移值
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      // 静态光斑：置于初始（静止）位置
      a1.setValue(0);
      a2.setValue(0);
      a3.setValue(0);
      return;
    }
    const loop = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur, useNativeDriver: true }),
        ])
      );
    const l1 = loop(a1, 6000);
    const l2 = loop(a2, 8000);
    const l3 = loop(a3, 10000);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [animate, a1, a2, a3]);

  if (!isDark) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>{children}</View>
    );
  }

  const move1 = a1.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });
  const move2 = a2.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const move3 = a3.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* 极光光斑层 */}
      <View style={styles.aurora} pointerEvents="none">
        <Animated.View
          style={[
            styles.blob,
            styles.blob1,
            { transform: [{ translateX: move1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.blob,
            styles.blob2,
            { transform: [{ translateX: move2 }, { translateY: move2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.blob,
            styles.blob3,
            { transform: [{ translateX: move3 }, { translateY: move3 }] },
          ]}
        />
      </View>

      {/* 内容层 */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  aurora: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  blob1: {
    width: 230,
    height: 230,
    backgroundColor: 'rgba(43,167,217,0.55)',
    top: -60,
    right: -60,
  },
  blob2: {
    width: 210,
    height: 210,
    backgroundColor: 'rgba(122,92,255,0.5)',
    top: '32%',
    left: -90,
  },
  blob3: {
    width: 190,
    height: 190,
    backgroundColor: 'rgba(228,85,184,0.42)',
    bottom: -50,
    right: -30,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
