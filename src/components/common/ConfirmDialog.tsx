import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';
import type { NoteIconName } from './NoteIcon';
import { NoteIcon } from './NoteIcon';

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** 强调图（线标）；危险操作可用 danger 图标 */
  iconName?: NoteIconName;
  /** 印章内的书体字（如「删」「记」）；提供时该弹窗用朱砂印章作图标（双主题保留朱砂） */
  sealText?: string;
  /** 是否为危险操作（确认按钮用朱砂 danger） */
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * 主题化确认弹窗 —— 见《note-demo-设计体系手册》§8
 * 居中卡（圆角13/卡底/细描边 + 柔和投影），标题宋体、正文淡墨；胶囊按钮双主题换肤。
 * 印章为朱砂「记」字（Ma Shan Zheng=系统 serif），双主题保留朱砂，配硬墨影 —— 跨主题品牌符号。
 * danger=true 时确认=朱砂 danger；危险但确认为朱砂主色时 danger=false + confirmLabel 自定义。
 */
export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  iconName,
  sealText,
  danger,
  confirmLabel = '确定',
  cancelLabel = '取消',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { colors, isDark } = useTheme();
  const confirmColor = danger ? colors.danger : colors.primary;
  const useSeal = !!sealText;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.mask}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {useSeal ? (
            <View style={styles.sealWrap}>
              <View style={[styles.seal, { backgroundColor: colors.primary }]}>
                <Text style={styles.sealChar}>{sealText}</Text>
              </View>
            </View>
          ) : (
            iconName && (
              <View style={[styles.iconWrap, { backgroundColor: danger ? colors.danger + '1a' : colors.primary + '1a' }]}>
                <NoteIcon name={iconName} size={24} color={confirmColor} />
              </View>
            )
          )}
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          ) : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                { backgroundColor: confirmColor, ...(isDark ? sealNightShadow : inkShadow) },
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
  },
  card: {
    alignSelf: 'stretch',
    maxWidth: 340,
    borderRadius: radius.l,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.l,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sealWrap: {
    marginBottom: spacing.m,
  },
  seal: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#B83A2A',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 0.85,
    shadowRadius: 0,
    elevation: 4,
  },
  sealChar: {
    color: '#F6F1E6',
    fontFamily: fontFamily.serif,
    fontWeight: '900',
    fontSize: 24,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.heavy,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  message: {
    fontSize: fontSize.body,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  btnRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.s,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    // 主色/危险色由调用方注入；硬墨影由 isDark 注入
  },
  cancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  confirmText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
});

// 印章硬影：日间 朱砂 / 夜间 黑（手册 §5.3）
const inkShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 2.5, height: 2.5 },
  shadowOpacity: 0.22,
  shadowRadius: 0,
  elevation: 3,
};
// 夜间确认钮硬影加深，避免与深空底融合
const sealNightShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 2.5, height: 2.5 },
  shadowOpacity: 0.5,
  shadowRadius: 0,
  elevation: 4,
};
