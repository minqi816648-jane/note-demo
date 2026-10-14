import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { fontSize, fontWeight } from '../../theme';

export type EditorSaveState =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'failed';

interface SaveStatusProps {
  state: EditorSaveState;
  onRetry?: () => void;
}

const TEXT: Record<EditorSaveState, string> = {
  idle: '',
  dirty: '未保存',
  saving: '保存中...',
  saved: '已保存',
  failed: '保存失败，点击重试',
};

export function SaveStatus({ state, onRetry }: SaveStatusProps) {
  const { colors } = useTheme();
  if (state === 'idle') return null;

  const color =
    state === 'saved'
      ? colors.success
      : state === 'failed'
      ? colors.danger
      : colors.textSecondary;

  const showRetry = state === 'failed';
  const content = (
    <>
      <View
        style={[
          styles.dot,
          { backgroundColor: color },
          (state === 'saving' || state === 'dirty') && styles.dotPulse,
        ]}
      />
      <Text style={[styles.text, { color }]}>{TEXT[state]}</Text>
    </>
  );

  if (showRetry && onRetry) {
    return (
      <TouchableOpacity style={styles.row} onPress={onRetry} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  dotPulse: {
    opacity: 0.6,
  },
  text: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
});
