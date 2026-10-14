import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Paths } from 'expo-file-system';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useHeaderTopInset, useBottomInset } from '../../src/hooks/useSafeArea';
import { useNoteStore } from '../../stores/noteStore';
import { NoteService } from '../../services';
import { TagService } from '../../services';
import { summarizeNote, summarizeNoteWithRefs } from '../../services';
import { confirmNoteClassification } from '../../services';
import { SavedLinkService } from '../../services';
import { fetchLinkMeta, categorizeUrl } from '../../services';
import { extractLinks } from '../../src/utils/html';
import { formatDateTime } from '../../src/utils/date';
import { Tag } from '../../src/components/common';
import { ConfirmDialog } from '../../src/components/common/ConfirmDialog';
import { LinkCard } from '../../src/components/note/LinkCard';
import { NoteTitleSection } from '../../src/components/note/NoteTitleSection';
import { NoteIcon } from '../../src/components/common/NoteIcon';
import { DetailFooter } from '../../src/components/note/DetailFooter';
import { MoreActionSheet } from '../../src/components/note/MoreActionSheet';
import { ShareSheet } from '../../src/components/note/ShareSheet';
import { AudioCard } from '../../src/components/note/AudioCard';
import { AttachmentList } from '../../src/components/note/AttachmentList';
import { NoteTodoSection } from '../../src/components/todo/NoteTodoSection';
import { getNoteAttachments } from '../../src/utils/noteAttachments';
import { extractLocalImagePaths } from '../../src/utils/noteAttachments';
import { buildMediaCardCss, parseMediaCards } from '../../src/utils/mediaCards';
import type { Note, Tag as TagType, Attachment } from '../../src/constants/theme';

/**
 * 笔记详情页（题跋式标题 + AI 摘要 + 多模态附件 + 更多操作 + 底部编辑/分享）
 */
export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();
  const { toggleFavorite, deleteNote, folders, categories, fetchFolders, fetchCategories } = useNoteStore();

  const [note, setNote] = useState<Note | null>(null);
  const [noteTags, setNoteTags] = useState<TagType[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiCitations, setAiCitations] = useState<{ id: string; title: string }[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmedOverride, setConfirmedOverride] = useState<number | null>(null);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 待确认状态（允许本地确认后覆盖）
  const isPendingClassification =
    confirmedOverride !== null
      ? confirmedOverride === 0
      : note?.ai_classify_confirmed === 0;

  const loadNote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const noteData = await NoteService.getNoteById(id);
      setNote(noteData);
      if (noteData) {
        setAiSummary(noteData.ai_summary);
        setAiCitations([]);
        const [tags, atts] = await Promise.all([
          TagService.getTagsByNoteId(id),
          getNoteAttachments(id),
        ]);
        setNoteTags(tags);
        setAttachments(atts);
      }
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // 加载笔记详情（每次该页获得焦点时刷新，使编辑页返回后附件/标签数据更新）
  useFocusEffect(
    useCallback(() => {
      if (id) loadNote();
      fetchFolders();
      fetchCategories();
    }, [id, loadNote, fetchFolders, fetchCategories])
  );

  // 获取文件夹名称
  const getFolderName = useCallback(
    (folderId: string | null): string => {
      if (!folderId) return '根目录';
      const folder = folders.find((f) => f.id === folderId);
      return folder?.name || '未知文件夹';
    },
    [folders]
  );

  // 获取分类名称
  const getCategoryName = useCallback(
    (categoryId: string | null): string => {
      if (!categoryId) return '未分类';
      const category = categories.find((c) => c.id === categoryId);
      return category?.name || '未知分类';
    },
    [categories]
  );

  // 解析 AI 标签
  const getAITags = useCallback((): string[] => {
    if (!note?.ai_tags) return [];
    try {
      return JSON.parse(note.ai_tags);
    } catch {
      return [];
    }
  }, [note]);

  // 删除笔记（打开主题化确认弹窗）
  const handleDelete = useCallback(() => {
    if (!note) return;
    setShowDeleteConfirm(true);
  }, [note]);

  const confirmDelete = useCallback(async () => {
    if (!note) return;
    try {
      await deleteNote(note.id);
      router.back();
    } catch {
      setShowDeleteConfirm(false);
    }
  }, [note, deleteNote, router]);

  // 分享笔记：打开分享与导出面板
  const handleShare = useCallback(() => {
    if (!note) return;
    setShowShareSheet(true);
  }, [note]);

  // 生成 AI 摘要
  const handleGenerateSummary = useCallback(async () => {
    if (!note || isGeneratingSummary) return;
    if (note.is_sensitive === 1) {
      Alert.alert('无法生成', '敏感笔记内容不会发送给 AI');
      return;
    }
    const contentText = note.content_text || note.title;
    if (!contentText.trim()) return;

    setIsGeneratingSummary(true);
    try {
      const res = await summarizeNoteWithRefs(note.id, contentText);
      if (res && res.summary) {
        setAiSummary(res.summary);
        setAiCitations(res.citations || []);
        await NoteService.updateNote(note.id, { ai_summary: res.summary });
        setNote((prev) => (prev ? { ...prev, ai_summary: res.summary } : prev));
      } else {
        Alert.alert('提示', '请先配置 AI API Key（设置 → AI 服务）');
      }
    } catch (error) {
      Alert.alert('摘要生成失败', (error as Error).message);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [note, isGeneratingSummary]);

  // 确认 AI 分类结果
  const handleConfirmClassification = useCallback(async () => {
    if (!note) return;
    const tags = getAITags();
    await confirmNoteClassification(note.id, note.category_id, tags);
    setConfirmedOverride(1);
    setNote((prev) => (prev ? { ...prev, ai_classify_confirmed: 1 } : prev));
    Alert.alert('已确认', '该笔记的 AI 分类已确认');
  }, [note, getAITags]);

  // 渲染 HTML 内容
  const renderContent = useCallback(() => {
    if (!note?.content) return null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <style>
          body {
            margin: 0;
            padding: 14px;
            font-size: 15px;
            line-height: 24px;
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            color: ${colors.textPrimary};
            background-color: ${colors.background};
          }
          img { max-width: 100% !important; height: auto !important; border-radius: 8px; }
          a { color: ${colors.primary}; }
          pre { white-space: pre-wrap; background: ${colors.card}; padding: 10px; border-radius: 8px; }
          blockquote { border-left: 3px solid ${colors.border}; margin: 0; padding-left: 12px; color: ${colors.textSecondary}; }
          h1, h2, h3 { line-height: 1.3; }
          hr { border: none; border-top: 1px solid ${colors.border}; }
          ${buildMediaCardCss(colors, isDark)}
        </style>
      </head>
      <body>${note.content || ''}</body>
      </html>
    `;

    return (
      <WebView
        originWhitelist={['about:blank']}
        source={{ html, baseUrl: Paths.document.uri }}
        style={styles.webview}
        scrollEnabled={false}
        scalesPageToFit={false}
        javaScriptEnabled={false}
        startInLoadingState
        allowFileAccess={true}
      />
    );
  }, [note, colors, isDark]);

  // 识别内容中的链接
  const links = useMemo(() => {
    if (!note?.content) return [];
    return extractLinks(note.content);
  }, [note?.content]);

  // 已保存链接 url 集合
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  useEffect(() => {
    (async () => {
      const set = new Set<string>();
      const saved = await SavedLinkService.getAllLinks();
      saved.forEach((l) => set.add(l.url));
      setSavedUrls(set);
    })();
  }, []);

  // 保存链接到链接库
  const handleSaveLink = useCallback(
    async (url: string) => {
      try {
        const meta = await fetchLinkMeta(url);
        const link = await SavedLinkService.saveLink({
          url: meta.url,
          title: meta.title,
          description: meta.description,
          favicon_url: meta.favicon_url,
          thumbnail_url: meta.favicon_url,
        });
        // 链接库「分类」已改为标签机制：把自动归类结果作为标签挂到该链接
        const cat = categorizeUrl(meta.url);
        if (cat && cat !== 'other') {
          await SavedLinkService.addTagToLink(link.id, cat);
        }
        setSavedUrls((prev) => new Set(prev).add(url));
      } catch (error) {
        Alert.alert('保存失败', (error as Error).message);
      }
    },
    []
  );

  // 已被内嵌为 content 卡片块的媒体（避免详情页底部与正文重复展示）
  const embeddedMedia = useMemo(() => {
    const attIds = new Set<string>();
    const imgPaths = new Set<string>();
    try {
      // 图片：统扫 content 中所有本地 file:// 图片路径（兼容卡片 data-src 与原生 <img src>）
      // 避免编辑器对 HTML 归一化后 data-src 与存储路径不一致，导致详情页重复展示
      extractLocalImagePaths(note?.content || '').forEach((p) => imgPaths.add(p));
      // 文件/音频：按卡片 data-attachment 去重
      parseMediaCards(note?.content || '').forEach(({ kind, data }) => {
        if ((kind === 'file' || kind === 'audio') && data.attachment) attIds.add(data.attachment);
      });
    } catch {
      // 忽略解析错误
    }
    return { attIds, imgPaths };
  }, [note?.content]);

  const standaloneAttachments = useMemo(() => {
    return attachments.filter((a) => {
      if (a.type === 'image') return !embeddedMedia.imgPaths.has(a.file_path);
      return !embeddedMedia.attIds.has(a.id);
    });
  }, [attachments, embeddedMedia]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={[styles.notFound, { color: colors.textSecondary }]}>笔记不存在</Text>
      </View>
    );
  }

  const aiTags = getAITags();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>
            <NoteIcon name="left" size={16} /> 返回
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowMoreSheet(true)} style={styles.headerIconButton}>
            <NoteIcon name="more" size={17} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + bottomInset }]}>
        {/* AI 分类待确认提示 */}
        {isPendingClassification && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.primary + '14', borderColor: colors.primary }]}>
            <Text style={styles.pendingBannerIcon}>✨</Text>
            <Text style={[styles.pendingBannerText, { color: colors.textPrimary }]}>
              AI 分类待确认
            </Text>
            <TouchableOpacity
              style={[styles.pendingConfirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmClassification}
            >
              <Text style={styles.pendingConfirmText}>确认</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 敏感笔记提示 */}
        {note.is_sensitive === 1 && (
          <View style={[styles.sensitiveBadge, { borderColor: colors.warning, backgroundColor: colors.warning + '14' }]}>
            <Text style={styles.sensitiveBadgeText}>🔒 敏感笔记：内容不会上传云端，也不会用于 AI 分析</Text>
          </View>
        )}

        {/* 题跋式标题区 */}
        <NoteTitleSection
          title={note.title}
          dateMeta={`${getCategoryName(note.category_id)} · ${getFolderName(note.parent_id)} · 更新于 ${formatDateTime(note.updated_at)}`}
        />

        {/* 标签 */}
        {(noteTags.length > 0 || aiTags.length > 0) && (
          <View style={styles.tagsContainer}>
            {noteTags.map((tag) => (
              <Tag key={tag.id} label={tag.name} color={tag.color || undefined} style={styles.tag} />
            ))}
            {aiTags.map((tagName, index) => (
              <Tag key={`ai-${index}`} label={tagName} style={styles.tag} />
            ))}
          </View>
        )}

        {/* AI 摘要 */}
        {aiSummary ? (
          <View style={[styles.aiSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.aiSummaryHeader}>
              <Text style={[styles.aiSummaryLabel, { color: colors.primary }]}>✨ 问墨摘要 · 自动生成</Text>
              <TouchableOpacity onPress={handleGenerateSummary} disabled={isGeneratingSummary}>
                <Text style={[styles.aiSummaryAction, { color: colors.primary }]}>
                  {isGeneratingSummary ? '生成中...' : '重新生成'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.aiSummaryText, { color: colors.textSecondary }]}>
              {aiSummary}
            </Text>
            {aiCitations.length > 0 && (
              <View style={styles.aiCiteWrap}>
                <Text style={[styles.aiCiteTitle, { color: colors.textDisabled }]}>引用来源</Text>
                {aiCitations.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => router.push(`/note/${c.id}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.aiCite, { color: colors.textSecondary }]} numberOfLines={1}>
                      📎 {c.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.aiSummaryActionBar, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleGenerateSummary}
            disabled={isGeneratingSummary}
          >
            <Text style={[styles.aiSummaryActionBarText, { color: colors.primary }]}>
              {isGeneratingSummary ? '正在生成摘要...' : '✨ 生成 AI 摘要'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 内容 */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* 识别到的链接 */}
        {links.length > 0 && (
          <View style={styles.linksSection}>
            <Text style={[styles.linksTitle, { color: colors.textSecondary }]}>🔗 链接 ({links.length})</Text>
            {links.map((url) => (
              <LinkCard
                key={url}
                url={url}
                saved={savedUrls.has(url)}
                onSave={handleSaveLink}
              />
            ))}
          </View>
        )}

        {/* 录音附件（未内嵌为卡片的） */}
        {standaloneAttachments.filter((a) => a.type === 'audio').map((a) => (
          <AudioCard key={a.id} attachment={a} />
        ))}

        {/* 附件展示（未内嵌为卡片的，文件附件可点击跳转预览/外开） */}
        <AttachmentList attachments={standaloneAttachments} />

        {/* 关联待办（敏感笔记不向 AI 发起待办提取，走本地） */}
        {note.is_sensitive === 1 ? (
          <NoteTodoSection noteId={note.id} contentText={note.content_text || note.title} allowAI={false} />
        ) : (
          <NoteTodoSection noteId={note.id} contentText={note.content_text || note.title} />
        )}
      </ScrollView>

      {/* 底部操作栏 */}
      <DetailFooter
        onEdit={() => router.push(`/note/${note.id}/edit`)}
        onShare={handleShare}
      />

      {/* 更多操作浮层 */}
      <MoreActionSheet
        visible={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        actions={[
          {
            key: 'fav',
            label: note.is_favorite === 1 ? '取消收藏' : '收藏',
            icon: 'star',
            onPress: () => toggleFavorite(note.id),
          },
          { key: 'share', label: '分享', icon: 'share', onPress: handleShare },
          { key: 'del', label: '删除', icon: 'trash', danger: true, onPress: handleDelete },
        ]}
      />

      {/* 分享与导出面板 */}
      <ShareSheet visible={showShareSheet} note={note} onClose={() => setShowShareSheet(false)} />

      {/* 删除确认（主题化弹窗） */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        iconName="trash"
        danger
        title="删除笔记"
        message={`确定要删除「${note?.title || '无标题'}」吗？此操作将移入回收站。`}
        confirmLabel="删除"
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: fontSize.body,
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
    paddingVertical: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.body,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
  },
  headerIcon: {},
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  pendingBanner: {
    marginHorizontal: spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.m,
  },
  pendingBannerIcon: {
    fontSize: fontSize.caption,
    marginRight: spacing.s,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  pendingConfirmBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
  },
  pendingConfirmText: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
  },
  sensitiveBadge: {
    marginHorizontal: spacing.l,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.m,
  },
  sensitiveBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  tag: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  aiSummary: {
    marginHorizontal: spacing.l,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.l,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  aiSummaryLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
  },
  aiSummaryAction: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  aiSummaryText: {
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  aiSummaryActionBar: {
    marginHorizontal: spacing.l,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.l,
    alignItems: 'center',
  },
  aiCiteWrap: {
    marginTop: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: spacing.s,
  },
  aiCiteTitle: {
    fontSize: fontSize.small,
    marginBottom: 2,
  },
  aiCite: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  aiSummaryActionBarText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  content: {
    marginTop: spacing.s,
    paddingHorizontal: spacing.l,
  },
  webview: {
    minHeight: 200,
    backgroundColor: 'transparent',
  },
  linksSection: {
    paddingHorizontal: spacing.l,
    marginTop: spacing.l,
  },
  linksTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.s,
  },
});
