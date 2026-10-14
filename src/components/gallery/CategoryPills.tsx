import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, fontWeight, radius } from '../../theme';

export type GalleryCategory = 'all' | 'image' | 'video' | 'ocr';

const CATEGORIES: { key: GalleryCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
  { key: 'ocr', label: 'OCR 文档' },
];

interface CategoryPillsProps {
  value: GalleryCategory;
  onChange: (c: GalleryCategory) => void;
}

/**
 * 图库分类筛选 pills（全部 / 图片 / 视频 / OCR 文档）
 */
export function CategoryPills({ value, onChange }: CategoryPillsProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.wrap}
    >
      {CATEGORIES.map((c) => {
        const active = c.key === value;
        return (
          <TouchableOpacity
            key={c.key}
            style={[
              styles.pill,
              active
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => onChange(c.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, { color: active ? '#FFF' : colors.textSecondary }]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0 },
  content: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    gap: spacing.s,
  },
  pill: {
    paddingHorizontal: spacing.m,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
