import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { useBottomInset } from '../../hooks/useSafeArea';
import { NoteIcon } from '../common/NoteIcon';

interface DetailFooterProps {
  onEdit: () => void;
  onShare: () => void;
}

/**
 * 详情页底部操作栏：编辑（朱砂实心）· 分享（描边）
 */
export function DetailFooter({ onEdit, onShare }: DetailFooterProps) {
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  return (
    <View style={[styles.wrap, { paddingBottom: spacing.m + bottomInset }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.shareBtn, { borderColor: colors.border }]}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <Text style={[styles.shareText, { color: colors.textPrimary }]}>分享</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.editBtn, { backgroundColor: colors.primary }]}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <View style={styles.editContent}>
            <NoteIcon name="edit" size={18} color="#FFF" />
            <Text style={styles.editText}>编辑</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  btn: {
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  shareText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  editBtn: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  editText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  editContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
});
