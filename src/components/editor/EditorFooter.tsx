import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';

interface EditorFooterProps {
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/**
 * 编辑器底部操作栏：放弃（描边）· 完成·存为笔记（朱砂硬阴影）
 */
export function EditorFooter({ saving, onDiscard, onSave }: EditorFooterProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.discardBtn, { borderColor: colors.primary }]}
          onPress={onDiscard}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={[styles.discardText, { color: colors.primary }]}>放弃</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={[styles.saveText, { fontFamily: fontFamily.serif }]}>完成</Text>
              <Text style={styles.saveSub}>存为笔记</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  btn: {
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardBtn: {
    flex: 1,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  discardText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    letterSpacing: 2,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  saveText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    letterSpacing: 2,
  },
  saveSub: {
    color: '#FFF',
    fontSize: fontSize.small,
    opacity: 0.85,
  },
});
