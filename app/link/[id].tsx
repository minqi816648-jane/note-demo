import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { SavedLinkService, fetchLinkMeta } from '../../services';
import { NoteIcon, type NoteIconName } from '../../src/components/common/NoteIcon';
import type { LinkTag } from '../../src/constants/theme';

export default function LinkEditScreen() {
  const { id, url: urlParam, title: titleParam } = useLocalSearchParams<{ id?: string; url?: string; title?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();

  const isNew = !id || id === 'new';

  const [url, setUrl] = useState(typeof urlParam === 'string' ? urlParam : '');
  const [title, setTitle] = useState(typeof titleParam === 'string' ? titleParam : '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<LinkTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(isNew ? false : true);
  const [saving, setSaving] = useState(false);

  // 加载标签全量
  useEffect(() => {
    (async () => {
      try {
        const allTags = await SavedLinkService.getAllLinkTags();
        setTags(allTags);
      } catch {
        // 忽略
      }
    })();
  }, [isNew]);

  // 编辑态：按 id 取链接（先全量拉取定位）
  useEffect(() => {
    if (isNew || !id) return;
    setLoading(true);
    (async () => {
      try {
        const all = await SavedLinkService.getAllLinks();
        const link = all.find((l) => l.id === id);
        if (link) {
          setUrl(link.url || '');
          setTitle(link.title || '');
          setDescription(link.description || '');
          const linkTags = await SavedLinkService.getTagsByLinkId(link.id);
          setSelectedTagIds(new Set(linkTags.map((t) => t.id)));
        }
      } catch {
        // 忽略
      } finally {
        setLoading(false);
      }
    })();
  }, [isNew, id]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const addNewTag = useCallback(async () => {
    const name = newTagInput.trim();
    if (!name) return;
    try {
      const tag = await SavedLinkService.createLinkTag(name);
      setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
      setSelectedTagIds((prev) => new Set(prev).add(tag.id));
      setNewTagInput('');
    } catch {
      Alert.alert('添加标签失败', '请重试');
    }
  }, [newTagInput]);

  const handleSave = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      Alert.alert('提示', '请输入链接地址');
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    setSaving(true);
    try {
      const link = await SavedLinkService.saveLink({
        url: normalized,
        title: title.trim() || null,
        description: description.trim() || null,
      });
      // 同步该链接的标签集
      const existingTags = await SavedLinkService.getTagsByLinkId(link.id);
      for (const t of existingTags) {
        if (!selectedTagIds.has(t.id)) await SavedLinkService.removeTagFromLink(link.id, t.id);
      }
      for (const tagId of selectedTagIds) {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) await SavedLinkService.addTagToLink(link.id, tag.name);
      }
      router.back();
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [url, title, description, selectedTagIds, tags, router]);

  // 已填写 URL 时自动抓取标题/描述（仅当标题为空时回填）
  const [fetching, setFetching] = useState(false);
  const handleFetchMeta = useCallback(async () => {
    const u = url.trim();
    if (!u || fetching) return;
    const normalized = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    setFetching(true);
    try {
      const meta = await fetchLinkMeta(normalized);
      if (meta) {
        setTitle((t) => (t ? t : meta.title));
        setDescription((d) => (d ? d : meta.description || ''));
      }
    } catch {
      // 抓取失败静默，不打断输入
    } finally {
      setFetching(false);
    }
  }, [url, fetching]);

  // 输入框左侧图标样式
  const fieldIconStyle = (name: NoteIconName) => [styles.fieldIcon, { borderColor: colors.border, backgroundColor: colors.card }];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="返回">
          <NoteIcon name="left" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>
          {isNew ? '收藏链接' : '编辑链接'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.bodyContent}
      >
        {/* 链接地址 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>链接地址</Text>
        <View style={styles.fieldRow}>
          <View style={fieldIconStyle('link')}>
            <NoteIcon name="link" size={18} color={colors.primary} />
          </View>
          <TextInput
            style={[styles.input, styles.inputUrl, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="https://example.com"
            placeholderTextColor={colors.textDisabled}
            value={url}
            onChangeText={setUrl}
            onBlur={handleFetchMeta}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* 标题 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>标题（可选）</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="链接标题"
          placeholderTextColor={colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        {/* 描述 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>描述（可选）</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="一句话描述这条链接…"
          placeholderTextColor={colors.textDisabled}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* 标签（可多选/增删，机制同笔记标签） */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>标签</Text>
        <View style={styles.tagWrap}>
          {tags.length === 0 && (
            <Text style={[styles.tagEmpty, { color: colors.textDisabled }]}>还没有标签，下方可新建</Text>
          )}
          {tags.map((t) => {
            const active = selectedTagIds.has(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tagChip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => toggleTag(t.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagChipText, { color: active ? '#FFF' : colors.textSecondary }]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 新建标签 */}
        <View style={styles.newTagRow}>
          <TextInput
            style={[styles.newTagInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="新建标签"
            placeholderTextColor={colors.textDisabled}
            value={newTagInput}
            onChangeText={setNewTagInput}
            onSubmitEditing={addNewTag}
            returnKeyType="done"
          />
          <TouchableOpacity style={[styles.newTagBtn, { backgroundColor: colors.primary }]} onPress={addNewTag} activeOpacity={0.7}>
            <NoteIcon name="plus" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  saveText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.heavy,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.m, paddingBottom: spacing.xxl },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.m,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    fontSize: fontSize.body,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputUrl: {
    // 链接地址输入框：颜色沿用主题
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  tagChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  tagEmpty: {
    fontSize: fontSize.small,
  },
  newTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.m,
  },
  newTagInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    fontSize: fontSize.body,
    marginRight: spacing.s,
  },
  newTagBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
