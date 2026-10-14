import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { spacing, fontSize, fontWeight, fontFamily } from '../../theme';
import { NoteCard } from '../note/NoteCard';
import type { Note } from '../../constants/theme';
import { formatDayGroup } from '../../utils/date';

interface DayRollProps {
  date: string; // YYYY-MM-DD
  notes: Note[];
}

/**
 * 当日长卷：展开选中日期，完整直排展示当日全部笔记。
 */
export function DayRoll({ date, notes }: DayRollProps) {
  const router = useRouter();
  const { colors } = useTheme();

  if (!date || notes.length === 0) return null;

  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const label = `${month}月${day}日 · ${notes.length}条`;

  return (
    <View style={[styles.roll, { borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.diamond, { backgroundColor: colors.primary }]} />
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
          {formatDayGroup(date)}
        </Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>{label}</Text>
      </View>

      <View style={styles.list}>
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} onPress={() => router.push(`/note/${n.id}`)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  roll: {
    marginTop: spacing.m,
    paddingTop: spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.s,
  },
  diamond: {
    width: 7,
    height: 7,
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.caption,
  },
  count: {
    fontSize: fontSize.small,
  },
  list: {
    paddingHorizontal: spacing.m,
  },
});
