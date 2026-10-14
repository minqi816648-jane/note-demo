import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, fontWeight, fontFamily } from '../../theme';

interface NoteTitleSectionProps {
  title: string;
  dateMeta?: string;
  sealText?: string;
}

/**
 * 题跋式标题区：左侧大字号宋体标题 + 日期元信息，右侧印章「记」垂直居底。
 * 右侧固定列宽，保证印章永不遮挡标题/日期。
 */
export function NoteTitleSection({ title, dateMeta, sealText = '记' }: NoteTitleSectionProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
          {title || '无标题笔记'}
        </Text>
        {dateMeta ? (
          <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: fontFamily.serif }]} numberOfLines={1}>
            {dateMeta}
          </Text>
        ) : null}
      </View>
      <View style={[styles.seal, { backgroundColor: colors.primary }]}>
        <Text style={styles.sealText}>{sealText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.m, // 为印章预留右侧空间，避免遮挡
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.heavy,
    lineHeight: 40,
    letterSpacing: 1,
  },
  meta: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 1,
  },
  seal: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
    marginBottom: 2,
  },
  sealText: {
    color: '#FFF',
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '900',
  },
});
