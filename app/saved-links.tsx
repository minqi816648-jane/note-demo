import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset, useBottomInset } from '../src/hooks/useSafeArea';
import { useAsyncData } from '../src/hooks/useAsyncData';
import { InlineError, ConfirmDialog } from '../src/components/common';
import { SavedLinkService } from '../services';
import { EmptyState } from '../src/components/common';
import { formatDate } from '../src/utils/date';
import { NoteIcon } from '../src/components/common/NoteIcon';
import type { SavedLink, LinkTag } from '../src/constants/theme';

export default function SavedLinksScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();

  // 链接数据
  const { data: rawLinks, loading: isLoading, error, load } = useAsyncData<SavedLink[]>(
    () => SavedLinkService.getAllLinks(),
    { auto: true }
  );
  const links = rawLinks ?? [];

  // 链接标签：全量注册表 + 每个链接的标签映射
  const [tags, setTags] = useState<LinkTag[]>([]);
  const [linkTagMap, setLinkTagMap] = useState<Record<string, LinkTag[]>>({});

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // 通用确认弹窗状态（删除链接 / 删除标签）
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // 加载标签数据
  const loadTags = useCallback(async () => {
    try {
      const all = await SavedLinkService.getAllLinkTags();
      setTags(all);
      const map: Record<string, LinkTag[]> = {};
      const links = await SavedLinkService.getAllLinks();
      for (const l of links) {
        map[l.id] = await SavedLinkService.getTagsByLinkId(l.id);
      }
      // 清理已不存在的链接引用
      const validIds = new Set(links.map((l) => l.id));
      for (const k of Object.keys(map)) {
        if (!validIds.has(k)) delete map[k];
      }
      setLinkTagMap(map);
    } catch {
      // 忽略标签加载失败
    }
  }, []);

  // 首次加载标签
  React.useEffect(() => {
    loadTags();
  }, [loadTags, rawLinks]);

  const openLink = useCallback((url: string, id: string) => {
    SavedLinkService.markRead(id).catch(() => {});
    load();
    loadTags();
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
  }, [load, loadTags]);

  const toggleRead = useCallback(async (link: SavedLink) => {
    const next = link.read_status === 1 ? 0 : 1;
    await SavedLinkService.setReadStatus(link.id, next);
    load();
  }, [load]);

  const handleRemove = useCallback(
    (link: SavedLink) => {
      setConfirm({
        title: '移除链接',
        message: `确定移除「${link.title || link.url}」吗？`,
        confirmLabel: '移除',
        onConfirm: async () => {
          await SavedLinkService.removeLink(link.id);
          load();
          loadTags();
        },
      });
    },
    [load, loadTags]
  );

  // ---- 标签操作 ----

  // 新建标签
  const handleCreateTag = useCallback(() => {
    Alert.prompt?.('新建标签', '输入标签名称', [
      { text: '取消', style: 'cancel' },
      {
        text: '创建',
        onPress: async (name?: string) => {
          const trimmed = (name || '').trim();
          if (!trimmed) return;
          try {
            await SavedLinkService.createLinkTag(trimmed);
            await loadTags();
          } catch {
            Alert.alert('创建失败', '无法创建该标签');
          }
        },
      },
    ]);
  }, [loadTags]);

  // 删除标签
  const handleDeleteTag = useCallback(
    (tag: LinkTag) => {
      setConfirm({
        title: '删除标签',
        message: `确定删除标签「${tag.name}」吗？将同时从所有链接移除。`,
        confirmLabel: '删除',
        onConfirm: async () => {
          await SavedLinkService.deleteLinkTag(tag.id);
          setActiveTag((prev) => (prev === tag.id ? null : prev));
          await loadTags();
        },
      });
    },
    [loadTags]
  );

  // 给某个链接添加标签
  const handleAddTagToLink = useCallback(
    (link: SavedLink) => {
      const current = linkTagMap[link.id] || [];
      // 供选择的：全部标签中未挂到该链接的
      const available = tags.filter((t) => !current.some((c) => c.id === t.id));
      Alert.alert('添加标签', `为「${link.title || link.url}」选择或输入标签`, [
        { text: '取消', style: 'cancel' },
        ...available.slice(0, 8).map((t) => ({
          text: t.name,
          onPress: async () => {
            await SavedLinkService.addTagToLink(link.id, t.name);
            await loadTags();
          },
        })),
        {
          text: '＋ 新标签',
          onPress: () =>
            Alert.prompt?.('新标签', '输入标签名称添加到该链接', [
              { text: '取消', style: 'cancel' },
              {
                text: '添加',
                onPress: async (name?: string) => {
                  const trimmed = (name || '').trim();
                  if (!trimmed) return;
                  await SavedLinkService.addTagToLink(link.id, trimmed);
                  await loadTags();
                },
              },
            ]),
        },
      ]);
    },
    [tags, linkTagMap, loadTags]
  );

  // 从链接移除标签
  const handleRemoveTagFromLink = useCallback(
    async (linkId: string, tag: LinkTag) => {
      await SavedLinkService.removeTagFromLink(linkId, tag.id);
      await loadTags();
    },
    [loadTags]
  );

  // 过滤：标签 + 仅未读
  const filtered = links.filter((l) => {
    if (activeTag && !(linkTagMap[l.id] || []).some((t) => t.id === activeTag)) return false;
    if (showUnreadOnly && l.read_status === 1) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="返回">
          <NoteIcon name="left" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <NoteIcon name="link" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>链接库</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/link/new')} style={styles.headerButton} accessibilityLabel="添加链接" accessibilityRole="button">
          <NoteIcon name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 标签筛选栏 */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          <TouchableOpacity
            style={[
              styles.catChip,
              { backgroundColor: activeTag === null ? colors.primary : colors.card, borderColor: colors.border },
            ]}
            onPress={() => setActiveTag(null)}
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
                onPress={() => setActiveTag(active ? null : t.id)}
                onLongPress={() => handleDeleteTag(t)}
                delayLongPress={350}
              >
                <Text style={[styles.catChipText, { color: active ? '#FFF' : colors.textSecondary }]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* 新建标签 */}
          <TouchableOpacity
            style={[styles.catChip, styles.addChip, { borderColor: colors.border }]}
            onPress={handleCreateTag}
            activeOpacity={0.7}
          >
            <Text style={[styles.catChipText, { color: colors.textSecondary }]}>＋ 标签</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity onPress={() => setShowUnreadOnly(!showUnreadOnly)} style={styles.unreadBtn}>
          <Text style={[styles.unreadBtnText, { color: showUnreadOnly ? colors.primary : colors.textSecondary, fontWeight: showUnreadOnly ? fontWeight.semiBold : fontWeight.regular }]}>
            仅未读
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.m + bottomInset }]}
        renderItem={({ item }) => {
          const itemTags = linkTagMap[item.id] || [];
          return (
            <View style={[styles.linkItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.linkBody} onPress={() => openLink(item.url, item.id)} activeOpacity={0.7}>
                {/* favicon */}
                <View style={[styles.iconBox, { backgroundColor: colors.card }]}>
                  {item.thumbnail_url || item.favicon_url ? (
                    <Image source={{ uri: (item.thumbnail_url as string) || '' }} style={styles.icon} />
                  ) : (
                    <NoteIcon name="link" size={20} color={colors.textSecondary} />
                  )}
                </View>

                <View style={styles.linkInfo}>
                  <Text style={[styles.linkTitle, { color: colors.textPrimary, fontWeight: item.read_status === 0 ? fontWeight.semiBold : fontWeight.regular }]} numberOfLines={1}>
                    {item.title || item.url}
                  </Text>
                  <Text style={[styles.linkUrl, { color: colors.textDisabled }]} numberOfLines={1}>
                    {item.url}
                  </Text>
                  <View style={styles.linkMetaRow}>
                    {item.read_status === 0 && (
                      <Text style={[styles.unreadBadge, { color: colors.primary }]}>● 未读</Text>
                    )}
                    {/* 标签 badges（点按移除该链接上的标签） */}
                    {itemTags.slice(0, 4).map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => handleRemoveTagFromLink(item.id, t)}
                        style={styles.linkTagBadge}
                      >
                        <Text style={[styles.linkTagText, { color: colors.primary }]}>{t.name} ×</Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={[styles.linkDate, { color: colors.textDisabled }]}>
                      {formatDate(item.updated_at)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleAddTagToLink(item)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: colors.primary }]}>＋ 标签</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(item)}>
                  <Text style={[styles.removeBtnText, { color: colors.danger }]}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>加载中...</Text>
          ) : error && links.length === 0 ? (
            <InlineError message={error} onRetry={load} />
          ) : (
            <EmptyState
              icon="🔗"
              title={filtered.length === 0 && links.length > 0 ? '没有匹配的链接' : '还没有保存的链接'}
              description="在笔记详情页点击链接的「保存」即可存入链接库"
              style={styles.emptyState}
            />
          )
        }
      />

      <ConfirmDialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        iconName="trash"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  emptyState: {
    paddingTop: 80,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  listContent: {
    padding: spacing.m,
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
  },
  icon: {
    width: 40,
    height: 40,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: fontSize.small,
    marginBottom: 2,
  },
  linkDate: {
    fontSize: fontSize.small,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catRow: {
    paddingHorizontal: spacing.m,
    alignItems: 'center',
  },
  catChip: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addChip: {
    borderStyle: 'dashed',
  },
  catChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  unreadBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  unreadBtnText: {
    fontSize: fontSize.caption,
  },
  linkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  unreadBadge: {
    fontSize: fontSize.small,
    marginRight: spacing.xs,
  },
  linkTagBadge: {
    backgroundColor: 'rgba(184,58,42,0.08)',
    borderRadius: 8,
    paddingHorizontal: spacing.s,
    paddingVertical: 1,
  },
  linkTagText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionBtn: {
    padding: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  removeBtnText: {
    fontSize: fontSize.caption,
  },
});
