import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { galleryToken } from '../../theme';
import { spacing, fontSize, fontWeight, fontFamily } from '../../theme';
import { GalleryCard, type GalleryItem } from './GalleryCard';
import { useRouter } from 'expo-router';

export interface YearMonthGroup {
  key: string; // "YYYY-MM"
  yearMonth: string; // "2026年8月"
  items: GalleryItem[];
}

interface GallerySectionProps {
  group: YearMonthGroup;
  expanded: boolean;
  onToggle: () => void;
  onRetry: (item: GalleryItem) => void;
  /** 懒加载：本组是否在可视区 */
  inView?: boolean;
}

/**
 * 图库年月分组（可折叠）+ 组内双栏瀑布流
 */
export function GallerySection({ group, expanded, onToggle, onRetry, inView = true }: GallerySectionProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const { left, right } = useMemo(() => {
    const l: GalleryItem[] = [];
    const r: GalleryItem[] = [];
    group.items.forEach((it, i) => {
      if (i % 2 === 0) l.push(it);
      else r.push(it);
    });
    return { left: l, right: r };
  }, [group.items]);

  const collapsed = !expanded;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={[styles.toggle, { color: colors.textPrimary }, collapsed && styles.toggleCollapsed]}>
          ▾
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
          {group.yearMonth}
        </Text>
        <Text style={[styles.count, { color: colors.textDisabled }]}>{group.items.length}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.grid}>
          <View style={styles.col}>{left.map((it) => (
            <GalleryCard
              key={it.id}
              item={it}
              inView={inView}
              onPress={() => router.push(`/note/${it.noteId}`)}
              onRetry={() => onRetry(it)}
            />
          ))}</View>
          <View style={styles.col}>{right.map((it) => (
            <GalleryCard
              key={it.id}
              item={it}
              inView={inView}
              onPress={() => router.push(`/note/${it.noteId}`)}
              onRetry={() => onRetry(it)}
            />
          ))}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  toggle: {
    fontSize: 10,
  },
  toggleCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  count: {
    fontSize: fontSize.small,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    gap: galleryToken.gap,
  },
  col: {
    flex: 1,
    gap: galleryToken.gap,
  },
});
