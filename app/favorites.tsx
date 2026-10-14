import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset } from '../src/hooks/useSafeArea';
import { NoteListView } from '../src/components/note/NoteListView';
import { NoteIcon } from '../src/components/common/NoteIcon';

/**
 * 收藏笔记页面（基于 is_favorite flag 聚合展示）
 */
export default function FavoritesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="返回">
          <NoteIcon name="left" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <NoteIcon name="star" size={18} color={colors.warning} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>收藏</Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      {/* 收藏笔记列表（每日长卷，无分类筛选） */}
      <NoteListView isFavoritesOnly />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
});
