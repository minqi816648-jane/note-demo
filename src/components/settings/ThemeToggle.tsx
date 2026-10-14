import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { NoteIcon } from '../common/NoteIcon';

interface ThemeToggleProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

/** 日/夜分段切换胶囊 */
export function ThemeToggle({ isDark, onToggleTheme }: ThemeToggleProps) {
  const { colors, isDark: themeDark } = useTheme();
  const segs = [
    { key: 'day', label: '日·水墨' },
    { key: 'night', label: '夜·极光' },
  ];
  return (
    <View
      style={[
        styles.toggle,
        { backgroundColor: themeDark ? 'rgba(255,255,255,0.08)' : 'rgba(220,214,200,0.5)' },
      ]}
    >
      {segs.map((seg) => {
        const active = (seg.key === 'night') === isDark;
        const iconColor = active ? (isDark ? '#0A0D1F' : '#FFFFFF') : colors.textSecondary;
        return (
          <TouchableOpacity
            key={seg.key}
            activeOpacity={0.8}
            onPress={() => {
              if (!active) onToggleTheme();
            }}
            style={[
              styles.segment,
              active && {
                backgroundColor: colors.textPrimary,
                borderRadius: radius.full,
              },
            ]}
          >
            <NoteIcon name="theme" size={15} color={iconColor} />
            <Text
              style={[
                styles.segText,
                active ? { color: isDark ? '#0A0D1F' : '#FFFFFF' } : { color: colors.textSecondary },
                active && { fontWeight: fontWeight.bold },
              ]}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.m,
    height: 46,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
