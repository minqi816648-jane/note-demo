import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { NoteIcon, type NoteIconName } from '../common/NoteIcon';

export type LinkHomeMode = 'note' | 'link';

interface SegSwitchProps {
  value: LinkHomeMode;
  onChange: (v: LinkHomeMode) => void;
  /** 左侧（手帖模式）的可点区域内容，通常是标题 + 印章 */
  leading?: React.ReactNode;
  /** 手帖段辅助图标 */
  noteIcon: NoteIconName;
  /** 链库段辅助图标 */
  linkIcon: NoteIconName;
}

/**
 * 手帖 / 链库 切换钮 —— 图标保持小尺寸，但可点热区覆盖标题+印章整片区域。
 * 左侧（含 leading / 标题·印章）= 切「手帖」；右侧 = 切「链库」。
 * 选中态由小图标语义色体现（日朱砂/夜极光青），leading 本身的样式不变。
 */
export function SegSwitch({ value, onChange, leading, noteIcon, linkIcon }: SegSwitchProps) {
  const { colors, isDark } = useTheme();
  const noteActive = value === 'note';
  const linkActive = value === 'link';
  const noteIconColor = noteActive ? (isDark ? '#8FE7F5' : '#B83A2A') : colors.textSecondary;
  const linkIconColor = linkActive ? (isDark ? '#8FE7F5' : '#B83A2A') : colors.textSecondary;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.noteZone}
        onPress={() => onChange('note')}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 8, right: 4 }}
        accessibilityRole="button"
        accessibilityState={{ selected: noteActive }}
        accessibilityLabel="手帖"
      >
        <View pointerEvents="none">{leading}</View>
        <View style={styles.noteIconBox}>
          <NoteIcon name={noteIcon} size={14} color={noteIconColor} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkZone}
        onPress={() => onChange('link')}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
        accessibilityRole="button"
        accessibilityState={{ selected: linkActive }}
        accessibilityLabel="链库"
      >
        <NoteIcon name={linkIcon} size={14} color={linkIconColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 13,
    paddingTop: 2,
    paddingBottom: 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  noteZone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  noteIconBox: {
    marginLeft: 4,
  },
  linkZone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
