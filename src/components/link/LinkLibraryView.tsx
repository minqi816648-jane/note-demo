import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { useBottomInset } from '../../hooks/useSafeArea';
import { SavedLinkService } from '../../../services';
import { EmptyState, ConfirmDialog } from '../common';
import { NoteIcon } from '../common/NoteIcon';
import { formatDate } from '../../utils/date';
import type { SavedLink, LinkTag } from '../../constants/theme';

/**
 * 链库视图（手帖首页第二视图）
 * 复用 SavedLinkService（真实数据，无 mock）：标签筛选 + 未读 + 搜索 + 收藏 + 外跳标记已读。
 * 三态空态：整页首装(hero) / 筛选无命中(muted) 走 EmptyState。
 */
export function LinkLibraryView() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const bottomInset = useBottomInset();

  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkTagMap, setLinkTagMap] = useState<Record<string, LinkTag[]>>({});

  const [q, setQ] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const all = await SavedLinkService.getAllLinks();
      setLinks(all);
      const map: Record<string, LinkTag[]> = {};
      for (const l of all) {
        map[l.id] = await SavedLinkService.getTagsByLinkId(l.id);
      }
      setLinkTagMap(map);
    } catch {
      // 失败保持既有状态
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 切到链库 / 返回页面时刷新
  const refresh = useCallback(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  const openLink = useCallback(
    (link: SavedLink) => {
      if (link.read_status === 0) {
        SavedLinkService.markRead(link.id).catch(() => {});
        setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, read_status: 1 } : l)));
      }
      WebBrowser.openBrowserAsync(link.url).catch(() => Linking.openURL(link.url));
    },
    []
  );

  const toggleFavorite = useCallback(
    async (link: SavedLink) => {
      await SavedLinkService.toggleFavorite(link.id).catch(() => {});
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, is_favorite: l.is_favorite === 1 ? 0 : 1 } : l))
      );
    },
    []
  );

  const handleRemove = useCallback((link: SavedLink) => {
    setConfirm({
      title: '移除链接',
      message: `确定移除「${link.title || link.url}」吗？`,
      confirmLabel: '移除',
      onConfirm: async () => {
        await SavedLinkService.removeLink(link.id);
        refresh();
      },
    });
  }, [refresh]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return links.filter((l) => {
      if (activeTag && !(linkTagMap[l.id] || []).some((t) => t.id === activeTag)) return false;
      if (showUnreadOnly && l.read_status === 1) return false;
      if (kw) {
        const tags = (linkTagMap[l.id] || []).map((t) => t.name.toLowerCase());
        const hay = `${l.title || ''} ${l.url} ${l.description || ''} ${tags.join(' ')}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [links, linkTagMap, activeTag, showUnreadOnly, q]);

  const unreadTotal = useMemo(() => links.filter((l) => l.read_status === 0).length, [links]);
  const hasNoLink = links.length === 0;

  return (
    <View style={styles.container}>
      {/* 搜索条 + 存链接 */}
      <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <NoteIcon name="search" size={15} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="搜索已存链接…"
            placeholderTextColor={colors.textDisabled}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
          />
          {q !== '' && (
            <TouchableOpacity onPress={() => setQ('')} accessibilityLabel="清除搜索">
              <NoteIcon name="close" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: isDark ? colors.primary : '#1C1B18' }]}
          onPress={() => router.push('/link/new')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="存链接"
        >
          <NoteIcon name="plus" size={16} color={isDark ? '#0A0D1F' : '#F6F1E6'} />
        </TouchableOpacity>
      </View>

      {/* 标签筛选 + 仅未读 */}
      <LinkFilterBar
        tags={Object.values(allTagsFrom(linkTagMap))}
        activeTag={activeTag}
        onSelectTag={(id) => setActiveTag((p) => (p === id ? null : id))}
        showUnreadOnly={showUnreadOnly}
        onToggleUnread={() => setShowUnreadOnly((v) => !v)}
        unreadTotal={unreadTotal}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.m + bottomInset }]}
        renderItem={({ item }) => (
          <LinkRow
            link={item}
            tags={linkTagMap[item.id] || []}
            colors={colors}
            isDark={isDark}
            onOpen={() => openLink(item)}
            onToggleFav={() => toggleFavorite(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>加载中...</Text>
          ) : hasNoLink ? (
            <EmptyState
              variant="hero"
              iconName="link"
              title="链库还没有存档"
              description="在笔记里点开网页，或用右上角＋收藏链接。"
              actions={[{ label: '＋ 存第一条链接', variant: 'primary', onClick: () => router.push('/link/new') }]}
            />
          ) : (
            <EmptyState
              variant="muted"
              iconName="search"
              title="未寻得匹配链接"
              description="清筛选或换关键词再试。"
            />
          )
        }
      />

      <ConfirmDialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        sealText="删"
        danger
        title={confirm?.title || ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || '确定'}
        onConfirm={() => {
          const c = confirm;
          if (!c) return;
          setConfirm(null);
          c.onConfirm();
        }}
      />
    </View>
  );
}

function allTagsFrom(map: Record<string, LinkTag[]>): LinkTag[] {
  const seen = new Map<string, LinkTag>();
  Object.values(map).forEach((arr) =>
    arr.forEach((t) => {
      if (!seen.has(t.id)) seen.set(t.id, t);
    })
  );
  return Array.from(seen.values());
}

interface LinkFilterBarProps {
  tags: LinkTag[];
  activeTag: string | null;
  onSelectTag: (id: string) => void;
  showUnreadOnly: boolean;
  onToggleUnread: () => void;
  unreadTotal: number;
}

function LinkFilterBar({
  tags,
  activeTag,
  onSelectTag,
  showUnreadOnly,
  onToggleUnread,
  unreadTotal,
}: LinkFilterBarProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.filterBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        <TouchableOpacity
          style={[
            styles.catChip,
            { backgroundColor: activeTag === null ? colors.primary : colors.card, borderColor: colors.border },
          ]}
          onPress={() => onSelectTag('')}
          activeOpacity={0.7}
        >
          <Text style={[styles.catChipText, { color: activeTag === null ? '#FFF' : colors.textSecondary }]}>全部</Text>
        </TouchableOpacity>
        {tags.map((t) => {
          const active = activeTag === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.catChip,
                { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border },
              ]}
              onPress={() => onSelectTag(t.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, { color: active ? '#FFF' : colors.textSecondary }]}>{t.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {unreadTotal > 0 && (
        <TouchableOpacity onPress={onToggleUnread} style={styles.unreadBtn}>
          <Text
            style={[
              styles.unreadBtnText,
              { color: showUnreadOnly ? colors.primary : colors.textSecondary, fontWeight: showUnreadOnly ? fontWeight.semiBold : fontWeight.regular },
            ]}
          >
            仅未读 {unreadTotal}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface LinkRowProps {
  link: SavedLink;
  tags: LinkTag[];
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
  onOpen: () => void;
  onToggleFav: () => void;
  onRemove: () => void;
}

function LinkRow({ link, tags, colors, isDark, onOpen, onToggleFav, onRemove }: LinkRowProps) {
  const isUnread = link.read_status === 0;
  return (
    <View style={[styles.linkItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.linkBody} onPress={onOpen} activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {link.thumbnail_url || link.favicon_url ? (
            <Image source={{ uri: (link.thumbnail_url || link.favicon_url) as string }} style={styles.icon} />
          ) : (
            <NoteIcon name="link" size={20} color={colors.textSecondary} />
          )}
        </View>
        <View style={styles.linkInfo}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.linkTitle, { color: colors.textPrimary, fontWeight: isUnread ? fontWeight.semiBold : fontWeight.regular }]}
              numberOfLines={1}
            >
              {link.title || link.url}
            </Text>
            {link.is_favorite === 1 && (
              <Text style={[styles.favMark, { color: '#E8C56A' }]}>★</Text>
            )}
          </View>
          <Text style={[styles.linkUrl, { color: colors.textDisabled }]} numberOfLines={1}>
            {link.url}
          </Text>
          <View style={styles.metaRow}>
            {isUnread && <Text style={[styles.unreadBadge, { color: '#C0392B' }]}>● 未读</Text>}
            {tags.slice(0, 3).map((t) => (
              <Text key={t.id} style={[styles.tagText, { color: isDark ? '#8FE7F5' : '#5A7A8A' }]}>
                #{t.name}
              </Text>
            ))}
            <Text style={[styles.date, { color: colors.textDisabled }]}>{formatDate(link.updated_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onToggleFav} style={styles.actionBtn} accessibilityLabel={link.is_favorite === 1 ? '取消收藏' : '收藏'}>
          <NoteIcon name="star" size={18} color={link.is_favorite === 1 ? '#E8C56A' : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={styles.actionBtn} accessibilityLabel="移除链接">
          <NoteIcon name="trash" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    height: 38,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    paddingVertical: 0,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catRow: {
    paddingHorizontal: spacing.m,
    alignItems: 'center',
  },
  catChip: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  unreadBtn: {
    paddingHorizontal: spacing.m,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  unreadBtnText: {
    fontSize: fontSize.caption,
  },
  listContent: {
    padding: spacing.m,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  linkBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: spacing.s,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.s,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 40,
    height: 40,
  },
  linkInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkTitle: {
    fontSize: fontSize.body,
    flexShrink: 1,
  },
  favMark: {
    fontSize: fontSize.body,
    marginLeft: spacing.xs,
  },
  linkUrl: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  unreadBadge: {
    fontSize: fontSize.small,
  },
  tagText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  date: {
    fontSize: fontSize.small,
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  actionBtn: {
    padding: spacing.xs,
  },
});
