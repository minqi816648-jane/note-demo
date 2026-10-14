import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { useMotionEnabled } from '../../animations';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

/**
 * 全局气泡提示（信息 toast）—— 主题化。
 * 日间水墨（朱砂/墨底），夜间极光（玻璃 + 极光色），随 useTheme 主题实时切换。
 * 由 ToastProvider 管理显示/隐藏与自动消失动画。
 */
export function ToastView({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  const { colors } = useTheme();
  const motionEnabled = useMotionEnabled();
  const opacity = useRef(new Animated.Value(motionEnabled ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!motionEnabled) {
      opacity.setValue(1);
      translateY.setValue(0);
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, [motionEnabled, opacity, translateY, onDone]);

  const accent =
    toast.type === 'success' ? colors.success : toast.type === 'error' ? colors.danger : colors.primary;

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        // 按类型给左侧描边强调色
        { borderLeftColor: accent, borderLeftWidth: 3 },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={3}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.l,
    right: spacing.l,
    bottom: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
  },
});
