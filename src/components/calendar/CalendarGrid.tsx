import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { calGrid } from '../../theme';
import { fontSize, fontWeight, fontFamily } from '../../theme';
import { InkDots } from './InkDots';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'] as const;

export interface DayCellData {
  date: string; // YYYY-MM-DD
  dayOfMonth: number | null;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  noteCount: number;
}

interface CalendarGridProps {
  cells: (DayCellData | null)[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  notesByDate: Map<string, number>;
}

function toPadding(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * 月历网格：7 列自适应，非当月补位、今日朱砂描边、周末/非当月淡化、墨点密度。
 */
export function CalendarGrid({ cells, selectedDate, onSelect, notesByDate }: CalendarGridProps) {
  const { colors } = useTheme();

  const countFor = (d: DayCellData | null): number => {
    if (!d) return 0;
    return notesByDate.get(d.date) || 0;
  };

  // 今日日期串
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${toPadding(now.getMonth() + 1)}-${toPadding(now.getDate())}`;
  }, []);

  return (
    <View style={styles.grid}>
      {/* 星期首字行 */}
      <View style={styles.weekRow}>
        {WEEK.map((w) => (
          <Text key={w} style={[styles.weekCell, { color: colors.textSecondary }]}>
            {w}
          </Text>
        ))}
      </View>

      {/* 日期格 */}
      <View style={styles.cellsRow}>
        {cells.map((d, i) => {
          if (!d) {
            return <View key={`pad-${i}`} style={styles.dayCell} />;
          }
          const count = countFor(d);
          const isSelected = d.date === selectedDate;
          const isToday = d.date === todayStr;
          const textColor = isToday
            ? colors.primary
            : d.isCurrentMonth
            ? colors.textPrimary
            : colors.calOtherMonthText;

          return (
            <TouchableOpacity
              key={d.date}
              style={[
                styles.dayCell,
                d.isToday && { backgroundColor: colors.calTodayBg },
                isSelected && { borderWidth: 1.5, borderColor: colors.primary },
              ]}
              onPress={() => onSelect(d.date)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${d.dayOfMonth}日，${count}条笔记`}
            >
              <Text
                style={[
                  styles.dayNum,
                  {
                    color: textColor,
                    fontWeight: d.isToday ? fontWeight.heavy : fontWeight.regular,
                  },
                ]}
              >
                {d.dayOfMonth}
              </Text>
              <InkDots count={count} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// 构建某月 6 行网格（含前后月补位）
export function buildMonthCells(year: number, month: number, notesByDate: Map<string, number>): (DayCellData | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=周日
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: (DayCellData | null)[] = [];

  // 上月尾部补位（一周从周日 start，firstWeekday=周日索引）
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const date = `${prevYear}-${toPadding(prevMonth + 1)}-${toPadding(day)}`;
    cells.push({ date, dayOfMonth: day, isToday: false, isCurrentMonth: false, isWeekend: isWeekend(firstWeekday - i), noteCount: notesByDate.get(date) || 0 });
  }

  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${toPadding(month + 1)}-${toPadding(d)}`;
    const weekday = (firstWeekday + d - 1) % 7;
    cells.push({ date, dayOfMonth: d, isToday: false, isCurrentMonth: true, isWeekend: isWeekend(weekday), noteCount: notesByDate.get(date) || 0 });
  }

  // 下月补位至 6 行（42 格）
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const weekday = (firstWeekday + daysInMonth + d - 1) % 7;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const date = `${nextYear}-${toPadding(nextMonth + 1)}-${toPadding(d)}`;
    cells.push({ date, dayOfMonth: d, isToday: false, isCurrentMonth: false, isWeekend: isWeekend(weekday), noteCount: notesByDate.get(date) || 0 });
  }

  return cells;
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 12,
  },
  weekRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
  },
  cellsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    minHeight: calGrid.cellMinHeight,
    alignItems: 'center',
    paddingTop: 5,
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dayNum: {
    fontSize: 12,
    lineHeight: 14,
  },
});
