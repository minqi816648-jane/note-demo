import React, { ReactNode, useRef } from 'react';
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { useMotionEnabled } from '../../animations';

interface PressableScaleProps {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 按压缩放倍率（默认 0.97，按下时缩小） */
  scaleTo?: number;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
}

/**
 * 卡片/可点击容器按压反馈：按下缩至 scaleTo（默认 0.97），松手弹性回弹。
 * 尊重 prefers-reduced-motion：系统开启时跳过缩放，仅靠外观反馈。
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  scaleTo = 0.97,
  accessibilityRole = 'button',
  accessibilityLabel,
}: PressableScaleProps) {
  const motionEnabled = useMotionEnabled();
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      speed: 20,
      bounciness: 6,
      useNativeDriver: true,
    });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={(e) => {
        if (motionEnabled) to(scaleTo).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (motionEnabled) to(1).start();
        onPressOut?.(e);
      }}
      style={style}
    >
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
