import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';

interface TagProps {
  label: string;
  color?: string;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Tag({ label, color, onPress, selected = false, style }: TagProps) {
  const { colors } = useTheme();
  
  // 标签颜色：优先使用传入颜色，否则使用主题主色
  const tagColor = color || colors.primary;
  
  // 背景色：使用颜色 15% 透明度
  const backgroundColor = selected ? tagColor : `${tagColor}26`; // 15% 透明度
  const textColor = selected ? '#FFFFFF' : tagColor;

  const content = (
    <View
      style={[
        styles.tag,
        {
          backgroundColor,
          borderColor: selected ? tagColor : `${tagColor}40`,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  tag: {
    height: 24,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
});
