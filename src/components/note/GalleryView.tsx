import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { spacing, fontSize } from '../../theme';
import { useNoteStore } from '../../../stores/noteStore';
import { AttachmentService } from '../../../services';
import { CategoryPills, type GalleryCategory } from '../gallery/CategoryPills';
import { GallerySection, type YearMonthGroup } from '../gallery/GallerySection';
import { type GalleryItem, type GalleryItemType } from '../gallery/GalleryCard';
import type { Note, Attachment } from '../../constants/theme';

interface GalleryViewProps {
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 图库视图（主页内嵌）：双栏瀑布流 + 分类筛选 + 年月分组折叠
 */
export function GalleryView({ sortBy = 'updated_at', sortOrder = 'desc' }: GalleryViewProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { notes, isLoading, fetchNotes } = useNoteStore();
  const [category, setCategory] = useState<GalleryCategory>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Map<string, Attachment[]>>(new Map());
  // 懒加载：记录可视年月组 key，仅可视组内图片解码
  const [inViewGroups, setInViewGroups] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ key?: string }> }) => {
      setInViewGroups((prev) => {
        const next = new Set<string>();
        viewableItems.forEach((v) => { if (v.key) next.add(v.key); });
        if (prev.size === next.size && [...prev].every((k) => next.has(k))) return prev;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    fetchNotes({ sortBy, sortOrder });
  }, [sortBy, sortOrder, fetchNotes]);

  // 批量加载各笔记附件（缩略图 / OCR / 时长）
  useEffect(() => {
    if (!notes.length) return;
    let cancelled = false;
    (async () => {
      const map = new Map<string, Attachment[]>();
      for (const n of notes) {
        try {
          const atts = await AttachmentService.getAttachmentsByNoteId(n.id);
          map.set(n.id, atts);
        } catch {
          /* 单个失败忽略 */
        }
      }
      if (!cancelled) setAttachments(map);
    })();
    return () => { cancelled = true; };
  }, [notes]);

  // 生成图库条目 + 年月分组
  const groups = useMemo<YearMonthGroup[]>(() => {
    const map = new Map<string, GalleryItem[]>();
    for (const n of notes) {
      const item = buildGalleryItem(n, attachments.get(n.id) || []);
      if (!item) continue;
      const key = n.updated_at.slice(0, 7); // YYYY-MM
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    const keys = [...map.keys()].sort((a, b) => (a > b ? -1 : 1));
    return keys.map((k) => {
      const items = (map.get(k) || []).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      const [y, m] = k.split('-');
      return { key: k, yearMonth: `${y}年${Number(m)}月`, items };
    });
  }, [notes, attachments]);

  // 分类过滤
  const filteredGroups = useMemo(() => {
    if (category === 'all') return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.type === category || (category === 'ocr' && it.type === 'ocr')),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, category]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRetry = useCallback(() => {
    fetchNotes({ sortBy, sortOrder });
  }, [fetchNotes, sortBy, sortOrder]);

  return (
    <View style={styles.container}>
      <CategoryPills value={category} onChange={setCategory} />

      <FlatList
        style={styles.list}
        data={filteredGroups}
        keyExtractor={(g) => g.key}
        initialNumToRender={4}
        windowSize={7}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={40}
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <GallerySection
            group={item}
            expanded={!collapsed.has(item.key)}
            onToggle={() => toggleGroup(item.key)}
            onRetry={handleRetry}
            inView={inViewGroups.has(item.key)}
          />
        )}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isLoading ? '加载中...' : '暂无相关内容'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchNotes({ sortBy, sortOrder })}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

/**
 * 由笔记 + 附件构建图库条目。所有笔记都会进入图库：
 * 有图 → image；有视频 → video；有 OCR 文字 → ocr；否则 → abstract（无图抽象卡）。
 */
function buildGalleryItem(note: Note, atts: Attachment[]): GalleryItem {
  // 提取正文内嵌图片路径
  const firstImg = (note.content || '').match(/src="(file:\/\/[^"]+)"/i)?.[1] || null;

  const imageAtts = atts.filter((a) => a.type === 'image');
  const videoAtts = atts.filter((a) => a.type === 'video');
  const ocrAtts = atts.filter((a) => !!a.ocr_text);

  const hasOcr = ocrAtts.length > 0;
  const hasVideo = videoAtts.length > 0 && !!videoAtts[0].file_path;
  const hasImage = !!firstImg || imageAtts.length > 0;
  const thumb = firstImg || imageAtts[0]?.thumbnail_path || imageAtts[0]?.file_path || null;

  let type: GalleryItemType;
  if (hasOcr) type = 'ocr';
  else if (hasVideo) type = 'video';
  else if (hasImage) type = 'image';
  else type = 'abstract';

  const preview =
    note.ai_summary ||
    (note.content_text ? (note.content_text.length > 90 ? `${note.content_text.slice(0, 90)}...` : note.content_text) : '');

  return {
    id: note.id,
    noteId: note.id,
    type,
    title: note.title || '无标题笔记',
    preview: type === 'abstract' ? preview : null,
    thumbnail: thumb,
    ocrText: ocrAtts[0]?.ocr_text || null,
    duration: videoAtts[0]?.duration ?? null,
    createdAt: note.updated_at,
    isFavorite: note.is_favorite === 1,
    hasError: false,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  content: {
    paddingBottom: fontSize.body,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.body,
  },
});
