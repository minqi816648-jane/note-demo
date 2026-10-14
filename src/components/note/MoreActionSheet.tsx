import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { useBottomInset } from '../../hooks/useSafeArea';
import { NoteIcon, type NoteIconName } from '../common/NoteIcon';

export interface MoreAction {
  key: string;
  label: string;
  icon: NoteIconName;
  danger?: boolean;
  onPress: () => void;
}

interface MoreActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: MoreAction[];
}

/**
 * 更多操作浮层（Bottom Sheet）：收藏/归档/分享/移动/删除等
 */
export function MoreActionSheet({ visible, onClose, actions }: MoreActionSheetProps) {
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mask} onPress={onClose} activeOpacity={1} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: spacing.m + bottomInset }]}>
        <View style={styles.handle} />
        {actions.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={styles.item}
            onPress={() => {
              onClose();
              a.onPress();
            }}
            activeOpacity={0.7}
          >
            <NoteIcon
              name={a.icon}
              size={20}
              color={a.danger ? colors.danger : colors.textPrimary}
            />
            <Text style={[styles.itemLabel, a.danger ? { color: colors.danger } : { color: colors.textPrimary }]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#D8CDB6',
    alignSelf: 'center',
    marginBottom: spacing.s,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  itemLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.m,
  },
});
