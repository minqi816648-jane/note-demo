import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNoteStore } from '../../../stores/noteStore';
import { AttachmentService, NoteService } from '../../../services';
import { usePlusSheet } from '../../context/PlusSheetContext';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, shadow, fontFamily } from '../../theme';
import { NoteFilterBar } from './NoteFilterBar';
import { EmptyState, AdaptiveImage, PressableScale } from '../common';
import { NoteIcon } from '../common/NoteIcon';
import { useCardIn, useWave } from '../../animations';
import type { Note, NoteFilter } from '../../constants/theme';
import { formatDayGroup, formatDate, groupNotesByDay } from '../../utils/date';

interface NoteListViewProps {
  folderId?: string | null;
  isFavoritesOnly?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  /** 排序变化时由上层同步（供图库视图共享） */
  onSortChange?: (sort: { sortBy: NoteFilter['sortBy']; sortOrder: NoteFilter['sortOrder'] }) => void;
}

// 每日长卷卡片尺寸（与 styles.scrollCard 保持一致）
export const NoteCardWidth = 236;

/**
 * 笔记列表视图（每日长卷）
 * 按天分组，每组为横向展阅的卡片行，日间为准墨/朱砂卷轴风
 */
export function NoteListView({
  folderId,
  isFavoritesOnly = false,
  sortBy = 'created_at',
  sortOrder = 'desc',
  onSortChange,
}: NoteListViewProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    notes,
    categories,
    tags,
    isLoading,
    error,
    fetchNotes,
    fetchFolders,
    fetchCategories,
    fetchTags,
  } = useNoteStore();
  const plusSheet = usePlusSheet();

  // 全库是否有笔记（用于区分 A 整页零笔记 / B 筛选无匹配）
  const [hasAnyNotes, setHasAnyNotes] = useState(false);
  const refreshHasAny = useCallback(async () => {
    try {
      const count = await NoteService.getNotesCount();
      setHasAnyNotes(count > 0);
    } catch {
      // 忽略失败，保持既有状态
    }
  }, []);
  useEffect(() => {
    refreshHasAny();
  }, [refreshHasAny, notes.length === 0]);

  const [filter, setFilter] = useState<NoteFilter>({
    sortBy,
    sortOrder,
  });
  const [refreshing, setRefreshing] = useState(false);
  // 懒加载：记录当前可视日的日期 key，仅此日内卡片加载图片
  const [inViewDays, setInViewDays] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ key?: string }> }) => {
    setInViewDays((prev) => {
      const next = new Set<string>();
      viewableItems.forEach((v) => {
        if (v.key) next.add(v.key);
      });
      // key 相同则复用旧引用，避免引起不必要重渲染
      if (prev.size === next.size && [...prev].every((k) => next.has(k))) return prev;
      return next;
    });
  }).current;

  // 同步来自上层的排序偏好（列表↔图库共享），跳过首次避免与初始化重复拉取
  const isFirstSortSync = useRef(true);
  useEffect(() => {
    if (isFirstSortSync.current) {
      isFirstSortSync.current = false;
      return;
    }
    setFilter((prev) => ({ ...prev, sortBy, sortOrder }));
    fetchNotes({ ...filter, sortBy, sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // 初始化加载
  useEffect(() => {
    fetchFolders();
    fetchCategories();
    fetchTags();

    const initialFilter: NoteFilter = {
      sortBy,
      sortOrder,
    };

    if (folderId !== undefined) {
      initialFilter.folderId = folderId;
    }
    if (isFavoritesOnly) {
      initialFilter.isFavorite = true;
    }

    setFilter(initialFilter);
    fetchNotes(initialFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, isFavoritesOnly]);

  // 筛选变化时重新加载
  const handleFilterChange = useCallback(
    (newFilter: NoteFilter) => {
      setFilter(newFilter);
      fetchNotes(newFilter);
      if (
        newFilter.sortBy !== filter.sortBy ||
        newFilter.sortOrder !== filter.sortOrder
      ) {
        onSortChange?.({
          sortBy: newFilter.sortBy ?? 'created_at',
          sortOrder: newFilter.sortOrder ?? 'desc',
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchNotes, onSortChange, filter.sortBy, filter.sortOrder]
  );

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotes(filter);
    await fetchFolders();
    setRefreshing(false);
  }, [fetchNotes, fetchFolders, filter]);

  const handleNotePress = useCallback(
    (noteId: string) => {
      router.push(`/note/${noteId}`);
    },
    [router]
  );

  // 按日分组（跟随所选排序字段，使排序在每日长卷中生效）
  const groups = useMemo(
    () =>
      groupNotesByDay<Note>(notes, {
        sortBy: filter.sortBy || 'updated_at',
        sortOrder: filter.sortOrder || 'desc',
      }),
    [notes, filter.sortBy, filter.sortOrder]
  );

  // 附件类型索引（多模态展示：图片缩略 / 语音墨波）
  // 仅依赖笔记 id 集合：新增/删除/鉴权变化才刷新，收藏/内容变化不触发全量重建
  const [attachIndex, setAttachIndex] = useState<Map<string, { hasImage: boolean; hasVoice: boolean; hasDocument: boolean }>>(new Map());
  const noteIdsKey = useMemo(() => notes.map((n) => n.id).join(','), [notes]);
  useEffect(() => {
    if (!noteIdsKey) return;
    let cancelled = false;
    AttachmentService.getAttachmentsTypeIndex(noteIdsKey.split(','))
      .then((m) => {
        if (!cancelled) setAttachIndex(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [noteIdsKey]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 筛选栏（A 态零笔记时隐藏以极简；收藏页不显示分类 pills，避免与“收藏”概念混淆） */}
      {!isFavoritesOnly && hasAnyNotes && (
        <NoteFilterBar
          filter={filter}
          onFilterChange={handleFilterChange}
          categories={categories}
        />
      )}

      {/* 每日长卷 */}
      {notes.length === 0 ? (
        <View style={styles.emptyWrap}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
            </View>
          ) : isFavoritesOnly ? (
            <EmptyState
              variant="muted"
              iconName="star"
              title="暂无收藏笔记"
              description="点击星标收藏重要的笔记"
              actions={[{ label: '写一篇', variant: 'outline', onClick: () => plusSheet.open() }]}
            />
          ) : hasAnyNotes ? (
            <EmptyState
              variant="muted"
              iconName="search"
              title="该分类暂无笔记"
              description="切换到其他分类，或写下第一篇"
              actions={[
                { label: '查看全部', variant: 'outline', onClick: () => handleFilterChange({ ...filter, categoryId: undefined }) },
              ]}
            />
          ) : (
            <EmptyState
              variant="hero"
              iconType="static"
              iconName="quill"
              sealText="记"
              title="从第一篇笔记开始"
              description="随手记录文字、语音、图片，交给问墨自动归类、打标签。"
              actions={[
                { label: '＋ 写第一篇', variant: 'primary', onClick: () => plusSheet.open() },
              ]}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => {
            const head = group[0] as Note;
            const raw = (head ? (head[filter.sortBy === 'created_at' ? 'created_at' : 'updated_at'] as string) : '') || '';
            return raw.slice(0, 10) || 'misc';
          }}
          renderItem={({ item: group, index }) => {
            const groupField = filter.sortBy === 'created_at' ? 'created_at' : 'updated_at';
            const head = group[0] as Note;
            const headDate = head ? (head as any)[groupField] || head.updated_at : '';
            const dayKey = (headDate as string)?.slice(0, 10) ?? '';
            const dayLabel = dayKey ? formatDayGroup(headDate) : '其他';
            return (
              <View style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <View style={[styles.sealDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.dayTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
                    {dayLabel}
                  </Text>
                  <Text style={[styles.dayCount, { color: colors.textSecondary }]}>
                    {group.length} 条
                  </Text>
                  {group.length > 2 && (
                    <Text style={[styles.dayMore, { color: colors.primary }]}>右滑展卷 ›</Text>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.roll}
                  decelerationRate="fast"
                  snapToInterval={NoteCardWidth + spacing.m}
                  snapToAlignment="start"
                  disableIntervalMomentum
                >
                  {group.map((note, cardIndex) => (
                    <LongScrollCard
                      key={note.id}
                      note={note}
                      colors={colors}
                      attachInfo={attachIndex.get(note.id)}
                      inView={inViewDays.has(dayKey)}
                      onPress={() => handleNotePress(note.id)}
                      entryDelay={(index * 3 + cardIndex) * 80}
                    />
                  ))}
                </ScrollView>
              </View>
            );
          }}
          initialNumToRender={6}
          windowSize={7}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={40}
          viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
          onViewableItemsChanged={onViewableItemsChanged}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* 新建入口已收敛到底部导航中央「+」创作浮层 */}

      {/* 错误提示 */}
      {error && (
        <View style={[styles.errorToast, { backgroundColor: colors.error }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * 每日长卷卡片：左侧朱砂卷轴光条 + 宋体标题 + 多模态（图片/语音/链接）+ 摘要 + 标签/时间
 */
function LongScrollCard({
  note,
  colors,
  attachInfo,
  onPress,
  entryDelay = 0,
  inView = true,
}: {
  note: Note;
  colors: ReturnType<typeof useTheme>['colors'];
  attachInfo?: { hasImage: boolean; hasVoice: boolean; hasDocument: boolean };
  onPress: () => void;
  entryDelay?: number;
  /** 懒加载：当前卡片所在日组是否在可视区 */
  inView?: boolean;
}) {
  const { isDark } = useTheme();
  const entryStyle = useCardIn(isDark, entryDelay);

  let aiTags: string[] = [];
  try {
    if (note.ai_tags) aiTags = JSON.parse(note.ai_tags);
  } catch {
    // 忽略解析错误
  }

  const text = note.content_text || '';
  const preview = note.ai_summary
    ? note.ai_summary
    : text
    ? text.length > 56
      ? `${text.slice(0, 56)}...`
      : text
    : '';

  const title = note.title
    ? note.title
    : text
    ? text.split('\n')[0].slice(0, 24) || '无标题笔记'
    : '无标题笔记';

  // 多模态判定
  const firstImg = (note.content || '').match(/src="(file:\/\/[^"]+)"/i)?.[1];
  const isImage = attachInfo?.hasImage || !!firstImg;
  const isVoice = attachInfo?.hasVoice || /（语音录音待处理）/.test(text);
  const isDocument = attachInfo?.hasDocument && !isImage && !isVoice;
  const isLink = !isImage && !isVoice && !isDocument && /https?:\/\//.test(text);

  // 语音声波条（eq 动效，仅语音卡启用，避免非语音卡空转无限动画）
  const waveCount = 6;
  const waveHeights = [7, 14, 9, 17, 6, 12];
  const { styles: waveStyles } = useWave(waveCount, true, isVoice);

  return (
    <Animated.View style={[entryStyle]}>
      <PressableScale
        style={[
          styles.scrollCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          shadow.light,
        ]}
        onPress={onPress}
      >
        {/* 朱砂卷轴光条 */}
        <View style={[styles.rollRail, { backgroundColor: colors.primary }]} />

        <View style={styles.cardBody}>
          {/* 图片卡：横排（左 48×48 缩略图 + 右标题）§8 */}
          {isImage ? (
            <View style={styles.imgRow}>
              <View style={[styles.thumbFix, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {firstImg ? (
                  <AdaptiveImage uri={firstImg} inView={inView} />
                ) : (
                  <NoteIcon name="img" size={22} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.imgRowContent}>
                <Text
                  style={[styles.scrollTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}
                  numberOfLines={3}
                >
                  {title}
                </Text>
                {note.is_favorite === 1 && <Text style={styles.favIcon}>★</Text>}
              </View>
            </View>
          ) : (
            <View style={styles.cardTitleRow}>
              <Text
                style={[styles.scrollTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}
                numberOfLines={2}
              >
                {title}
              </Text>
              {note.is_favorite === 1 && <Text style={styles.favIcon}>★</Text>}
            </View>
          )}

          {/* 语音卡：声波直出（eq 动效），隐藏 p 摘要 §8 */}
          {isVoice && (
            <View style={styles.waveRow}>
              {waveHeights.map((h, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.textPrimary, height: h },
                    waveStyles[i],
                  ]}
                />
              ))}
            </View>
          )}

          {/* 链接卡：链接标识 + 未读红点 §8 */}
          {isLink && (
            <View style={styles.linkRow}>
              <NoteIcon name="link" size={14} color={colors.textSecondary} />
              <Text style={[styles.linkTag, { color: colors.textSecondary, marginLeft: 4 }]}>链接</Text>
              <View style={styles.unreadDot} />
            </View>
          )}

          {/* 文字卡摘要（语音卡不显示） */}
          {preview !== '' && !isImage && !isVoice && (
            <Text style={[styles.scrollPreview, { color: colors.textSecondary }]} numberOfLines={2}>
              {preview}
            </Text>
          )}

          <View style={styles.cardFooter}>
            {isDocument && (
              <View style={styles.attachTag}>
                <NoteIcon name="clip" size={12} color={colors.textSecondary} />
              </View>
            )}
            {aiTags.slice(0, 1).map((t, i) => (
              <Text key={i} style={[styles.rollTag, { color: colors.primary, borderColor: colors.border }]}>
                {t}
              </Text>
            ))}
            <Text style={[styles.rollTime, { color: colors.textDisabled }]}>
              {formatDate(note.updated_at)}
            </Text>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.body,
  },
  dayBlock: {
    marginBottom: spacing.s,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  sealDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: spacing.s,
    transform: [{ rotate: '45deg' }],
  },
  dayTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    letterSpacing: 1,
  },
  dayCount: {
    fontSize: fontSize.small,
    marginLeft: spacing.xs,
  },
  dayMore: {
    fontSize: fontSize.small,
    marginLeft: 'auto',
  },
  roll: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.s,
  },
  scrollCard: {
    width: NoteCardWidth,
    borderRadius: radius.l,
    marginRight: spacing.m,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
  },
  rollRail: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.65,
  },
  cardBody: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
  },
  imgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  thumbFix: {
    width: 48,
    height: 48,
    borderRadius: radius.s,
    marginRight: spacing.m,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    // 金色渐变占位（日）/ 极光淡底（夜）由卡片背景体现
  },
  imgRowContent: {
    flex: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5734E',
    marginLeft: spacing.s,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  linkTag: {
    fontSize: fontSize.small,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scrollTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.heavy,
    lineHeight: 22,
    flex: 1,
    marginRight: spacing.s,
  },
  favIcon: {
    fontSize: fontSize.caption,
    color: '#C9A227',
  },
  scrollPreview: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.s,
  },
  attachTag: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginRight: spacing.xs,
  },
  rollTag: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.s,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: spacing.s,
    overflow: 'hidden',
  },
  rollTime: {
    fontSize: fontSize.small,
  },
  errorToast: {
    position: 'absolute',
    top: 8,
    left: spacing.m,
    right: spacing.m,
    padding: spacing.s,
    borderRadius: radius.s,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
  },
});
