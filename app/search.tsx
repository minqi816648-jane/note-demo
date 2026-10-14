import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset, useBottomInset } from '../src/hooks/useSafeArea';
import { searchAll, searchByTag, aiSearch, CategoryService } from '../services';
import type { SearchResultItem, AiSearchResult } from '../services';
import { EmptyState } from '../src/components/common';
import { EmptySearch } from '../src/components/common/EmptySearch';
import { HighlightText } from '../src/components/common/HighlightText';
import { CategoryIcon } from '../src/components/common/CategoryIcon';
import { NoteIcon } from '../src/components/common/NoteIcon';
import { formatDate } from '../src/utils/date';
import type { Category } from '../src/constants/theme';

type SearchMode = 'all' | 'tag' | 'ai';
const HISTORY_KEY = '@note_demo/search_history';

export default function SearchScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAll = mode === 'all';
  const isTag = mode === 'tag';
  const isAi = mode === 'ai';

  // 加载分类 + 历史
  useEffect(() => {
    CategoryService.getSystemCategories().then(setCategories).catch(() => {});
    AsyncStorage.getItem(HISTORY_KEY)
      .then((v) => setHistory(v ? JSON.parse(v) : []))
      .catch(() => {});
  }, []);

  const saveHistory = useCallback((q: string) => {
    const t = q.trim();
    if (!t) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 20);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, []);

  const removeHistoryItem = useCallback((item: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== item);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // 执行搜索
  const doSearch = useCallback(async (q: string) => {
    const k = q.trim();
    if (!k) {
      setResults([]);
      setAiResult(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      if (isAi) {
        setResults([]);
        const r = await aiSearch(k);
        setAiResult(r);
      } else {
        setAiResult(null);
        let items: SearchResultItem[] = [];
        const catFilter = category !== 'all' ? { categoryId: category } : undefined;
        if (isTag) {
          items = await searchByTag(k, catFilter, 30);
        } else {
          items = (await searchAll(k, catFilter)).items;
        }
        // 时间筛选
        if (timeRange !== 'all') {
          const cutoff = Date.now() - parseRangeDays(timeRange) * 86400000;
          items = items.filter((it) => new Date(it.updated_at).getTime() >= cutoff);
        }
        setResults(items);
      }
    } finally {
      setLoading(false);
    }
  }, [isAi, isTag, timeRange, category]);

  // 防抖：全文/标签实时；AI 模式回车触发
  useEffect(() => {
    if (isAi) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, category, timeRange, doSearch, isAi]);

  const handleRunQuery = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      setQuery(t);
      saveHistory(t);
      doSearch(t);
    },
    [saveHistory, doSearch]
  );

  const handleSubmit = useCallback(() => {
    handleRunQuery(query);
  }, [handleRunQuery, query]);

  // CTA：切到 AI 语义并搜索当前词
  const switchToAISearch = useCallback(() => {
    setMode('ai');
    if (query.trim()) {
      saveHistory(query);
      doSearch(query);
    }
  }, [query, saveHistory, doSearch]);

  const handlePress = useCallback(
    (item: SearchResultItem) => {
      if (item.type === 'note' && item.note_id) {
        saveHistory(query);
        router.push(`/note/${item.note_id}`);
      } else if (item.type === 'todo') {
        router.push('/tabs/todos');
      }
    },
    [router, query, saveHistory]
  );

  const modeTabs: { value: SearchMode; label: string }[] = [
    { value: 'all', label: '全文' },
    { value: 'tag', label: '标签' },
    { value: 'ai', label: 'AI 语义' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部搜索栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>←</Text>
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <NoteIcon name="search" size={17} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="搜索笔记、标签..."
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
          {query !== '' && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <NoteIcon name="close" size={14} color={colors.textDisabled} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 模式 Tab */}
      <View style={[styles.modeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {modeTabs.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => setMode(t.value)}
            style={[styles.modeTab, mode === t.value && { backgroundColor: colors.textPrimary }]}
          >
            <Text
              style={[
                styles.modeText,
                {
                  color: mode === t.value
                    ? (isDark ? '#0A0D1F' : '#FFFFFF')
                    : colors.textSecondary,
                  fontWeight: mode === t.value ? fontWeight.bold : fontWeight.medium,
                },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 筛选 Pills（全文/标签模式） */}
      {!isAi && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              style={[styles.filterPill, { borderColor: category === 'all' ? colors.primary : colors.border }, category === 'all' && { backgroundColor: colors.card }]}
              onPress={() => setCategory('all')}
            >
              <Text style={[styles.filterText, { color: category === 'all' ? colors.textPrimary : colors.textSecondary }]}>全部分类</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.filterPill, { borderColor: category === c.id ? colors.primary : colors.border }, category === c.id && { backgroundColor: colors.card }]}
                onPress={() => setCategory(category === c.id ? 'all' : c.id)}
              >
                <View style={styles.filterPillInner}>
                  <CategoryIcon category={c} size={14} color={category === c.id ? colors.textPrimary : colors.textSecondary} />
                  <Text style={[styles.filterText, { color: category === c.id ? colors.textPrimary : colors.textSecondary, marginLeft: 5 }]}>
                    {c.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {['all', '7d', '30d'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.filterPill, { borderColor: timeRange === r ? colors.primary : colors.border }, timeRange === r && { backgroundColor: colors.card }]}
                onPress={() => setTimeRange(timeRange === r ? 'all' : r)}
              >
                <Text style={[styles.filterText, { color: timeRange === r ? colors.textPrimary : colors.textSecondary }]}>
                  {r === 'all' ? '不限时间' : r === '7d' ? '近7天' : '近30天'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 历史（空输入时） */}
      {query.trim() === '' && history.length > 0 && (
        <ScrollView style={styles.historyWrap} contentContainerStyle={styles.historyContent}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>最近墨迹</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={[styles.clearAll, { color: colors.textSecondary }]}>清空</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.historyTags}>
            {history.map((h) => (
              <View key={h} style={[styles.historyTag, { borderColor: colors.border }]}>
                <TouchableOpacity onPress={() => handleRunQuery(h)} activeOpacity={0.7}>
                  <Text style={[styles.historyTagText, { color: colors.textPrimary }]}>{h}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeHistoryItem(h)} hitSlop={8}>
                  <Text style={[styles.historyTagX, { color: colors.textDisabled }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* 内容区 */}
      {query.trim() === '' ? (
        !history.length ? (
          <EmptyState icon="🔍" title="搜索" description="输入关键词查找笔记与待办" style={styles.emptyState} />
        ) : null
      ) : loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : isAi ? (
        aiResult ? (
          <ScrollView style={styles.listContent} contentContainerStyle={{ paddingBottom: spacing.m + bottomInset }}>
            <View style={[styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.aiLabel, { color: colors.primary }]}>✨ 问墨 · AI 语义</Text>
              <Text style={[styles.aiAnswer, { color: colors.textPrimary }]}>{aiResult.answer}</Text>
            </View>
            {aiResult.citations.length > 0 && (
              <Text style={[styles.citationTitle, { color: colors.textSecondary }]}>引用来源</Text>
            )}
            {aiResult.citations.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.citation, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => { saveHistory(query); router.push(`/note/${c.id}`); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.citationText, { color: colors.textPrimary }]} numberOfLines={1}><NoteIcon name="link" size={13} /> {c.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptySearch query={query} mode="ai" aiEnabled={false} />
        )
      ) : results.length === 0 && searched ? (
        <EmptySearch query={query} mode={mode} onAISearch={switchToAISearch} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.m + bottomInset }]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <NoteIcon name={item.type === 'note' ? 'note' : 'todoadd'} size={17} style={styles.resultIcon} />
              <View style={styles.resultInfo}>
                <HighlightText
                  style={styles.resultTitle}
                  text={item.title}
                  query={isTag ? '' : query}
                  numberOfLines={1}
                />
                {item.snippet ? (
                  <HighlightText
                    style={styles.resultSnippet}
                    text={item.snippet}
                    query={isTag ? '' : query}
                    numberOfLines={2}
                  />
                ) : null}
                <Text style={[styles.resultMeta, { color: colors.textDisabled }]}>
                  {item.type === 'note' ? '笔记' : '待办'} · {formatDate(item.updated_at)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function parseRangeDays(r: string): number {
  if (r === '7d') return 7;
  if (r === '30d') return 30;
  return 0;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.s,
  },
  headerButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  headerButtonText: { fontSize: fontSize.body },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
  },
  searchIcon: { marginRight: spacing.s },
  searchInput: { flex: 1, height: '100%', fontSize: fontSize.body },
  clearIcon: {},
  modeBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.s,
  },
  modeTab: {
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  modeText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  filterRow: { paddingVertical: spacing.s },
  filterContent: { paddingHorizontal: spacing.m, gap: spacing.s },
  filterPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  filterPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: { fontSize: fontSize.small, fontWeight: fontWeight.medium },
  historyWrap: { flexGrow: 1 },
  historyContent: { padding: spacing.m },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.m },
  historyTitle: { fontSize: fontSize.body, fontWeight: fontWeight.semiBold },
  clearAll: { fontSize: fontSize.small },
  historyTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  historyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: spacing.m,
    paddingRight: spacing.s,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyTagText: { fontSize: fontSize.caption },
  historyTagX: { fontSize: fontSize.small, paddingHorizontal: 2 },
  loading: { marginTop: spacing.xxl },
  emptyState: { paddingTop: 80 },
  listContent: { padding: spacing.m },
  aiCard: {
    borderRadius: radius.l,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  aiLabel: { fontSize: fontSize.caption, fontWeight: fontWeight.semiBold, marginBottom: spacing.s },
  aiAnswer: { fontSize: fontSize.body, lineHeight: 22 },
  citationTitle: { fontSize: fontSize.caption, fontWeight: fontWeight.semiBold, marginBottom: spacing.s },
  citation: {
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  citationText: { fontSize: fontSize.body },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.m,
  },
  resultIcon: { marginRight: spacing.m, marginTop: 2 },
  resultInfo: { flex: 1, minWidth: 0 },
  resultTitle: { fontSize: fontSize.body, fontWeight: fontWeight.semiBold, marginBottom: 2 },
  resultSnippet: { fontSize: fontSize.caption, lineHeight: 18, marginBottom: 4 },
  resultMeta: { fontSize: fontSize.small },
});
