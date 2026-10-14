import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { NoteIcon, type NoteIconName } from '../common/NoteIcon';

export type NoteViewKind = 'list' | 'calendar' | 'gallery';

interface ViewToggleProps {
  value: NoteViewKind;
  onChange: (v: NoteViewKind) => void;
}

const ITEMS: { key: NoteViewKind; icon: NoteIconName }[] = [
  { key: 'list', icon: 'list' },
  { key: 'calendar', icon: 'cal' },
  { key: 'gallery', icon: 'grid' },
];

/**
 * 笔记视图切换（列 / 历 / 图）—— 手帖页头部右侧（§5）
 * 选中态：日=焦墨底白图标；夜=极光底深色图标
 */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const { colors, isDark } = useTheme();

  const activeBg = isDark ? colors.primary : '#1C1B18';
  const activeIcon = isDark ? '#0A0D1F' : '#FFFFFF';

  return (
    <View style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {ITEMS.map((it) => {
        const active = it.key === value;
        return (
          <TouchableOpacity
            key={it.key}
            style={[styles.item, active && { backgroundColor: activeBg }]}
            onPress={() => onChange(it.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <NoteIcon name={it.icon} size={15} color={active ? activeIcon : colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: {
    width: 28,
    height: 24,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
