import React from 'react';
import { Text, type TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface HighlightTextProps extends TextProps {
  text: string;
  /** 需描金高亮的命中词（大小写不敏感，子串匹配） */
  query?: string;
}

/**
 * 命中词描金高亮文本（复用 AI 描金：淡金底 + 加粗）
 */
export function HighlightText({ text, query, style, ...rest }: HighlightTextProps) {
  const { colors } = useTheme();
  if (!query || !text) {
    return (
      <Text style={[{ color: colors.textPrimary }, style]} {...rest}>
        {text}
      </Text>
    );
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
  return (
    <Text style={[{ color: colors.textPrimary }, style]} {...rest}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() && part !== '' ? (
          <Text key={i} style={[styles.mark, { backgroundColor: colors.gold, color: colors.goldText }]}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const styles = StyleSheet.create({
  mark: {
    fontWeight: '700',
    paddingHorizontal: 1,
    borderRadius: 2,
  },
});
