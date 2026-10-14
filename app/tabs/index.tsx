import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { useNoteStore, useHomeViewStore } from '../../stores';
import { NoteListView } from '../../src/components/note/NoteListView';
import { CalendarView } from '../../src/components/note/CalendarView';
import { GalleryView } from '../../src/components/note/GalleryView';
import { ViewToggle, NoteViewKind } from '../../src/components/note/ViewToggle';
import { AuroraBackground } from '../../src/components/common';
import { NoteIcon } from '../../src/components/common/NoteIcon';
import { SegSwitch } from '../../src/components/link/SegSwitch';
import { LinkLibraryView } from '../../src/components/link/LinkLibraryView';
import { useSealPulse } from '../../src/animations';
import { NoteService, SavedLinkService } from '../../services';

/**
 * 笔记首页（手帖）
 * 每日长卷列表 / 日历 / 图库三视图切换，创建入口在底部导航中央「+」
 */
export default function NotesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const { notes } = useNoteStore();
  const viewMode = useHomeViewStore((s) => s.mode);
  const setViewMode = useHomeViewStore((s) => s.setMode);
  const [view, setView] = useState<NoteViewKind>('list');
  const [pendingCount, setPendingCount] = useState(0);
  const [linkTotal, setLinkTotal] = useState(0);
  const [linkUnread, setLinkUnread] = useState(0);
  // 排序偏好在列表/图库间共享（默认「创建时间」§6.3）
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 进入页面时刷新待确认数量 + 链库统计
  useFocusEffect(
    useCallback(() => {
      NoteService.getPendingClassificationCount().then(setPendingCount).catch(() => {});
      SavedLinkService.getAllLinks()
        .then((links) => {
          setLinkTotal(links.length);
          setLinkUnread(links.filter((l) => l.read_status === 0).length);
        })
        .catch(() => {});
    }, [])
  );

  // 今日已记笔数（按 updated_at 属于今天统计）
  const todayCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return notes.filter((n) => {
      const t = new Date(n.updated_at).getTime();
      return t >= start;
    }).length;
  }, [notes]);

  const monthDay = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }, []);

  const openSearch = useCallback(() => router.push('/search'), [router]);
  const openPending = useCallback(() => router.push('/pending-classification'), [router]);

  // 印章脉冲
  const sealPulse = useSealPulse();

  const isLinkMode = viewMode === 'link';

  return (
    <AuroraBackground style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部标题栏（手帖 / 链库） */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <View style={styles.headerLeft}>
          {/* 手帖丨链库 切换：左侧整片（标题+印章）为「手帖」热区，右侧为「链库」 */}
          <SegSwitch
            value={viewMode}
            onChange={setViewMode}
            noteIcon="note"
            linkIcon="link"
            leading={
              <View style={styles.brand}>
                <Text style={[styles.brandTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
                  {isLinkMode ? '链库' : '手帖'}
                </Text>
                <Animated.View style={[styles.seal, { backgroundColor: colors.primary }, sealPulse]}>
                  <Text style={styles.sealText}>{isLinkMode ? '链' : '记'}</Text>
                </Animated.View>
              </View>
            }
          />
          <Text style={[styles.dateSub, { color: colors.textSecondary }]}>
            {isLinkMode ? `已收 ${linkTotal} 条 · ${linkUnread} 未读` : `${monthDay} · 今日已记 ${todayCount} 笔`}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {!isLinkMode && (
            <View style={styles.headerActionsInner}>
              <TouchableOpacity onPress={openSearch} style={styles.searchBtn}>
                <NoteIcon name="search" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
              <ViewToggle value={view} onChange={setView} />
            </View>
          )}
        </View>
      </View>

      {/* 待确认分类提示 */}
      {pendingCount > 0 && (
        <TouchableOpacity
          onPress={openPending}
          style={[styles.pendingBanner, { backgroundColor: colors.primary + '14', borderColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.pendingIcon}>✨</Text>
          <Text style={[styles.pendingText, { color: colors.textPrimary }]}>
            有 {pendingCount} 篇笔记的 AI 分类待确认
          </Text>
          <Text style={[styles.pendingArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      )}

      {/* 内容区：手帖三视图 / 链库 */}
      {isLinkMode ? (
        <LinkLibraryView />
      ) : (
        <>
          {view === 'list' && (
            <NoteListView
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(s) => {
                setSortBy(s.sortBy ?? 'updated_at');
                setSortOrder(s.sortOrder ?? 'desc');
              }}
            />
          )}
          {view === 'calendar' && <CalendarView />}
          {view === 'gallery' && <GalleryView sortBy={sortBy} sortOrder={sortOrder} />}
        </>
      )}
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: fontWeight.heavy,
    letterSpacing: 3,
    marginRight: spacing.s,
  },
  seal: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
    transform: [{ rotate: '-4deg' }],
  },
  sealText: {
    color: '#F6F1E6',
    fontFamily: 'serif',
    fontSize: 12,
    fontWeight: '900',
  },
  dateSub: {
    fontSize: fontSize.small,
    letterSpacing: 1,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerActionsInner: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  searchBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(28,27,24,0.05)',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pendingIcon: { fontSize: fontSize.caption, marginRight: spacing.s },
  pendingText: { flex: 1, fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  pendingArrow: { fontSize: fontSize.subtitle, marginLeft: spacing.s },
});
