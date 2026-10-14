import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, fontWeight } from '../../theme';
import { useNoteStore } from '../../../stores/noteStore';
import { MonthNav } from '../calendar/MonthNav';
import { CalendarGrid, buildMonthCells } from '../calendar/CalendarGrid';
import { DayRoll } from '../calendar/DayRoll';
import type { Note } from '../../constants/theme';

/**
 * 日历视图（主页内嵌）：月历网格 + 墨点密度 + 当日长卷
 */
export function CalendarView() {
  const { colors } = useTheme();
  const { notes, isLoading, fetchNotes } = useNoteStore();

  const now = new Date();
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth());

  // 选中日期（YYYY-MM-DD）
  const todayStr = useMemo(() => {
    const d = new Date();
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);

  useEffect(() => {
    fetchNotes({ sortBy: 'updated_at', sortOrder: 'desc' });
  }, [fetchNotes]);

  // 日期(YYYY-MM-DD) → 笔记数组
  const notesByDateFull = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of notes) {
      const key = n.updated_at.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(n);
      else map.set(key, [n]);
    }
    return map;
  }, [notes]);

  // 日期 → 笔数映射（供网格）
  const notesByCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const [k, list] of notesByDateFull) map.set(k, list.length);
    return map;
  }, [notesByDateFull]);

  const cells = useMemo(
    () => buildMonthCells(curYear, curMonth, notesByCount),
    [curYear, curMonth, notesByCount]
  );

  // 当月笔记总数
  const monthTotal = useMemo(() => {
    const prefix = `${curYear}-${curMonth + 1 < 10 ? `0${curMonth + 1}` : curMonth + 1}`;
    let total = 0;
    for (const [k, v] of notesByCount) {
      if (k.startsWith(prefix)) total += v;
    }
    return total;
  }, [curYear, curMonth, notesByCount]);

  const selectedNotes = selectedDate ? notesByDateFull.get(selectedDate) || [] : [];

  const goPrev = useCallback(() => {
    setCurMonth((m) => {
      if (m === 0) {
        setCurYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);
  const goNext = useCallback(() => {
    setCurMonth((m) => {
      if (m === 11) {
        setCurYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => fetchNotes({ sortBy: 'updated_at', sortOrder: 'desc' })}
          tintColor={colors.primary}
        />
      }
    >
      {/* 月头区 */}
      <View style={styles.monthArea}>
        <MonthNav year={curYear} month={curMonth} onPrev={goPrev} onNext={goNext} />
        <View style={styles.todayMeta}>
          <View style={[styles.todayDot, { backgroundColor: colors.primary, borderColor: colors.primary }]} />
          <Text style={[styles.todayText, { color: colors.textSecondary }]}>
            {curYear}年{curMonth + 1}月 · 已记 {monthTotal} 笔
          </Text>
        </View>
      </View>

      {/* 月历网格 */}
      <CalendarGrid
        cells={cells}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        notesByDate={notesByCount}
      />

      {/* 当日长卷 */}
      {selectedNotes.length > 0 && (
        <DayRoll date={selectedDate!} notes={selectedNotes} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  monthArea: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  todayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  todayText: {
    fontSize: fontSize.small,
  },
});
