import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

// ============================================
// 动效工具（对应《4页面UI设计方案.md》第9章）
// 全部基于 RN 内置 Animated，避免额外依赖
// ============================================

// 时长档位
export const durations = {
  press: 200,
  sheet: 550,
  wave: 1100,
  seal: 5000,
  ring: 2300,
  brush: 700,
  orbit: 2600,
  inkIn: 780,
  bIn: 700,
} as const;

// 核心缓动曲线
export const easing = {
  // 墨晕入场 / 浮层滑入：cubic-bezier(.2,.8,.2,1)
  ink: Easing.bezier(0.2, 0.8, 0.2, 1),
  // 玻璃弹性入场（微过冲）：cubic-bezier(.2,.9,.3,1.2)
  bIn: Easing.bezier(0.2, 0.9, 0.3, 1.2),
  // 光环扩散
  ring: Easing.out(Easing.cubic),
} as const;

/**
 * 是否启用动效：系统开启「减少动态效果」时返回 false。
 */
export function useMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  return !reduced;
}

/**
 * 卡片入场动画（日间 inkIn：上移+渐显；夜间 bIn：弹性+缩放）
 * 返回可绑定的 Animated.View style。delay 用于交错。
 * 系统开启 reduced-motion 时直接静态呈现（enabled 自动失效）。
 */
export function useCardIn(isDark: boolean, delay = 0, enabled = true) {
  const motionEnabled = useMotionEnabled();
  const active = enabled && motionEnabled;
  const progress = useRef(new Animated.Value(active ? 0 : 1)).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(1);
      return;
    }
    progress.stopAnimation();
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: isDark ? durations.bIn : durations.inkIn,
      delay,
      easing: isDark ? easing.bIn : easing.ink,
      useNativeDriver: false,
    }).start();
    return () => progress.stopAnimation();
  }, [isDark, delay, active, progress]);

  return {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [isDark ? 14 : 10, 0],
        }),
      },
      ...(isDark
        ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }]
        : []),
    ],
  } as StyleProp<ViewStyle>;
}

/**
 * 声波律动（eq）：一组交错延迟的缩放条。
 * reduced-motion 时退化为静态满刻度。
 * enabled=false 时完全不启动动画（用于非语音卡，避免无限循环拖慢列表）。
 */
export function useWave(count = 5, infinite = false, enabled = true) {
  const motionEnabled = useMotionEnabled();
  const active = enabled && motionEnabled;
  const values = useMemo(
    () => Array.from({ length: count }, () => new Animated.Value(active ? 0 : 1)),
    [count, active]
  );

  useEffect(() => {
    if (!active) return;
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: durations.wave,
            easing: Easing.inOut(Easing.ease),
            delay: i * 120,
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: durations.wave,
            easing: Easing.inOut(Easing.ease),
            delay: i * 120,
            useNativeDriver: false,
          }),
        ]),
        infinite ? { iterations: -1 } : { iterations: 1 }
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, infinite, active]);

  const styles = values.map((v) => ({
    transform: [
      {
        scaleY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [infinite ? 0.45 : 0.3, 1.2],
        }),
      },
    ],
  }));

  return { styles };
}

/**
 * 印章脉冲（sealPulse）：微旋转+微缩放循环。
 * reduced-motion 时退化为静态。
 */
export function useSealPulse() {
  const motionEnabled = useMotionEnabled();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motionEnabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: durations.seal,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: durations.seal,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, motionEnabled]);

  return {
    transform: [
      {
        rotate: progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['-4deg', '-2deg', '-4deg'],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.05, 1],
        }),
      },
    ],
  };
}

/**
 * 光环扩散（ringp）：扩散 + 渐隐循环。
 * staggerMs：与首环错开的起始相位（毫秒），用于双层涟漪。
 * reduced-motion 时退化为静态（fill 一次到位 / 循环直接保持）。
 */
export function useRippleRing(fill = false, staggerMs = 0) {
  const motionEnabled = useMotionEnabled();
  const scale = useRef(new Animated.Value(fill ? 0.85 : 0.8)).current;
  const opacity = useRef(new Animated.Value(fill ? 0.9 : 0.9)).current;

  useEffect(() => {
    if (!motionEnabled) {
      scale.setValue(fill ? 1 : 1);
      opacity.setValue(0);
      return;
    }
    if (fill) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.35,
          duration: durations.ring,
          easing: easing.ring,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: durations.ring,
          easing: easing.ring,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    const loopScale = Animated.loop(
      Animated.sequence([
        Animated.delay(staggerMs % durations.ring),
        Animated.timing(scale, {
          toValue: 1.35,
          duration: durations.ring,
          easing: easing.ring,
          useNativeDriver: false,
        }),
      ])
    );
    const loopOpacity = Animated.loop(
      Animated.sequence([
        Animated.delay(staggerMs % durations.ring),
        Animated.timing(opacity, {
          toValue: 0,
          duration: durations.ring,
          easing: easing.ring,
          useNativeDriver: false,
        }),
      ])
    );
    loopScale.start();
    loopOpacity.start();
    return () => {
      loopScale.stop();
      loopOpacity.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fill, staggerMs, scale, opacity, motionEnabled]);

  return {
    opacity,
    transform: [{ scale }],
  };
}
