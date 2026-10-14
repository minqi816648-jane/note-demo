import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { NoteIcon } from '../common/NoteIcon';
import { CategoryIcon } from '../common/CategoryIcon';
import type { NoteFilter } from '../../constants/theme';

interface NoteFilterBarProps {
  filter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
  categories: { id: string; name: string; icon: string | null; color: string | null; is_system: number }[];
}

const SORT_OPTIONS = [
  { value: 'created_at', label: '创建时间' },
  { value: 'title', label: '标题' },
] as const;

/**
 * 笔记筛选栏 —— 见《笔记列表页-开发沟通方案5.0》第六章
 * 同行为：横向分类 pills（左、弹性占满）+ 排序下拉按钮（右、固定）。
 * 分类筛选：全部 / 工作 / 学习 / 生活（含新建分类）；排序：创建时间（默认）/ 标题。
 */
export function NoteFilterBar({ filter, onFilterChange, categories }: NoteFilterBarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [sortOpen, setSortOpen] = useState(false);
  // 排序按钮的绝对定位（y），用于在 Modal 内精准锚定下拉
  const [anchorY, setAnchorY] = useState(0);
  const anchorRef = useRef<View>(null);

  const activeSort = (SORT_OPTIONS.find((o) => o.value === filter.sortBy) || SORT_OPTIONS[0]);

  const pickSort = (value: typeof SORT_OPTIONS[number]['value']) => {
    onFilterChange({ ...filter, sortBy: value });
    setSortOpen(false);
  };

  const openSort = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorY(y + height + 4);
    });
    setSortOpen((v) => !v);
  };

  const sortLabel = activeSort.value === 'title' ? '标题' : '创建时间';

  return (
    <View style={styles.container}>
      {/* 分类 pills（左，弹性占满） */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !filter.categoryId
              ? styles.categoryChipActive
              : { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => onFilterChange({ ...filter, categoryId: undefined })}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: !filter.categoryId ? '#FFF' : colors.textSecondary },
            ]}
          >
            全部
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const active = filter.categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                active
                  ? styles.categoryChipActive
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                onFilterChange({ ...filter, categoryId: active ? undefined : cat.id })
              }
              onLongPress={() => router.push(`/category/${cat.id}`)}
              delayLongPress={350}
              activeOpacity={0.7}
            >
              <View style={styles.chipInner}>
                <CategoryIcon category={cat} size={14} color={active ? '#FFF' : colors.textSecondary} />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: active ? '#FFF' : colors.textSecondary, marginLeft: 5 },
                  ]}
                >
                  {cat.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* 新建分类 */}
        <TouchableOpacity
          style={[styles.categoryChip, styles.addChip, { borderColor: colors.border }]}
          onPress={() => router.push('/category/new')}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryChipText, { color: colors.textSecondary }]}>＋ 分类</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 排序下拉按钮（右，固定） */}
      <View ref={anchorRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.sortBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={openSort}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="排序"
        >
          <NoteIcon name="sort" size={13} color={colors.textSecondary} />
          <Text style={[styles.sortBtnLabel, { color: colors.textPrimary }]}>{sortLabel}</Text>
          <Text style={[styles.sortBtnArrow, { color: colors.textSecondary }]}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* 排序下拉浮层（右对齐，Modal 内精准锚定） */}
      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
        statusBarTranslucent
      >
        <TouchableOpacity style={styles.mask} activeOpacity={1} onPress={() => setSortOpen(false)} />
        <View
          style={[
            styles.dropdown,
            { top: anchorY, backgroundColor: colors.surface, borderColor: colors.border, ...shadow.card },
          ]}
        >
          {SORT_OPTIONS.map((opt) => {
            const active = activeSort.value === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.dropdownItem}
                onPress={() => pickSort(opt.value)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownItemLeft}>
                  {active && <View style={[styles.dropdownDot, { backgroundColor: colors.primary }]} />}
                  <Text
                    style={[
                      styles.dropdownItemText,
                      { color: active ? colors.primary : colors.textPrimary },
                      active && { fontWeight: fontWeight.semiBold },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    marginTop: spacing.s,
    marginBottom: spacing.s,
  },
  categoryBar: {
    flex: 1,
  },
  categoryContent: {
    paddingRight: spacing.s,
  },
  categoryChip: {
    height: 32,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#1C1B18',
    // 不规则圆角（999px 12px 999px 14px 的 RN 近似）
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.m,
    borderBottomLeftRadius: radius.full,
    borderBottomRightRadius: 14,
    borderWidth: 0,
  },
  categoryChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  addChip: {
    borderStyle: 'dashed',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: spacing.s,
  },
  sortBtnLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  sortBtnArrow: {
    fontSize: fontSize.small,
    marginLeft: spacing.xs,
  },
  mask: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    right: spacing.m,
    width: 128,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.s,
  },
  dropdownItemText: {
    fontSize: fontSize.body,
  },
});
