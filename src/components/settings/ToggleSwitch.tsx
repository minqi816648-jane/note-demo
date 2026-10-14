import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** 开关控件（30×17，朱砂/灰轨道，ThemeToggle 用） */
export function ToggleSwitch({ value, onValueChange, disabled }: ToggleSwitchProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[
        styles.track,
        { backgroundColor: value ? colors.primary : colors.border },
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.thumb,
          { backgroundColor: '#FFF', transform: [{ translateX: value ? 14 : 0 }] },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 34,
    height: 19,
    borderRadius: 99,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 15,
    height: 15,
    borderRadius: 99,
  },
  disabled: {
    opacity: 0.5,
  },
});
