import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { AuroraBackground } from '../../src/components/common';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAIStore } from '../../stores/aiStore';
import { ThemeToggle } from '../../src/components/settings/ThemeToggle';
import { GroupTitle } from '../../src/components/settings/GroupTitle';
import { CardRowShell, CardRowContent } from '../../src/components/settings/CardRow';
import { ToggleSwitch } from '../../src/components/settings/ToggleSwitch';
import { StorageCard } from '../../src/components/settings/StorageCard';
import { getDB } from '../../services/db/database';
import { NoteService, TodoService, importMarkdownNote, readTextFile } from '../../services';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ConfirmDialog } from '../../src/components/common/ConfirmDialog';
import { useToast } from '../../src/context/ToastContext';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const { autoClassify, setAutoClassify, aiProvider } = useSettingsStore();
  const { noApiKey } = useAIStore();
  const router = useRouter();
  const { showToast } = useToast();

  const [notify, setNotify] = useState(false);
  const [storage, setStorage] = useState({ used: 0, total: 2 * 1024 * 1024 * 1024, cacheSize: 0 });
  const [notesCount, setNotesCount] = useState(0);

  // 估算存储：附件目录 + 笔记数量
  useEffect(() => {
    (async () => {
      try {
        const db = await getDB();
        const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL');
        setNotesCount(row?.c ?? 0);
        // 用笔记数近似估算已用（含附件基础占用）
        setStorage((s) => ({ ...s, used: (row?.c ?? 0) * 512 * 1024 }));
      } catch {}
    })();
  }, []);

  const openTrash = () => router.push('/trash');
  const openFavorites = () => router.push('/favorites');
  const openFolders = () => router.push('/folders');
  const openAISettings = () => router.push('/ai-settings');

  const providerLabel = aiProvider === 'deepseek' ? 'DeepSeek' : '通义千问';

  const handleClearCache = useCallback(() => {
    Alert.alert('清理缓存', '确定清理临时缓存吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清理',
        onPress: () => {
          setStorage((s) => ({ ...s, cacheSize: 0, used: s.used - s.cacheSize }));
          Alert.alert('已清理', '缓存已释放');
        },
      },
    ]);
  }, []);

  // 导出全部笔记/待办为 Markdown 文件并拉起分享
  const [exporting, setExporting] = useState(false);
  const handleExportData = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [notes, todos] = await Promise.all([
        NoteService.getNotes({}),
        TodoService.getTodos(), // 待办查询可能因 filter 忽略，这里取全量
      ]);
      const parts: string[] = [];
      parts.push('# note-demo 数据导出');
      parts.push(`导出时间：${new Date().toLocaleString()}`);

      // 笔记（敏感笔记默认排除，不随导出离开沙箱）
      const exportedNotes = notes.filter((n) => n.is_sensitive !== 1);
      const skippedSensitive = notes.length - exportedNotes.length;
      parts.push('\n\n## 笔记');
      if (!exportedNotes.length) parts.push('\n（无笔记）');
      for (const n of exportedNotes) {
        parts.push(`\n## ${n.title || '无标题笔记'}`);
        if (n.content_text) parts.push('\n\n' + n.content_text);
        if (n.category_id || n.ai_tags) {
          parts.push('\n\n*元数据：' + ['分类/标签', n.category_id || '', n.ai_tags || ''].filter(Boolean).join(' · ') + '*');
        }
      }
      if (skippedSensitive > 0) {
        parts.push(`\n\n> 已排除 ${skippedSensitive} 篇敏感笔记（不在导出中）`);
      }

      // 待办
      parts.push('\n\n## 待办');
      if (!todos.length) parts.push('\n（无待办）');
      for (const t of todos) {
        parts.push(`\n- ${t.title}${t.status === 'completed' ? '（已完成）' : ''}`);
        if (t.description) parts.push(`\n  ${t.description}`);
      }

      parts.push('\n\n---\n由 note-demo 导出');

      const dir = new Directory(Paths.document, 'exports');
      if (!dir.exists) dir.create({ intermediates: true, overwrite: true });
      const name = `note-demo-导出-${Date.now()}`;
      const file = new File(dir, `${name}.md`);
      file.write(parts.join('\n'));

      const ok = await Sharing.isAvailableAsync();
      if (!ok) {
        Alert.alert('提示', '当前设备不支持分享导出');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'text/markdown', dialogTitle: '导出笔记数据' });
      file.delete();
    } catch (e) {
      Alert.alert('导出失败', (e as Error).message);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  // 导入 Markdown 笔记
  const [importing, setImporting] = useState(false);
  const handleImportData = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await File.pickFileAsync({
        mimeTypes: ['text/markdown', 'text/plain', 'text/*', 'application/octet-stream'],
      });
      if (result.canceled || !result.result) return;

      const files = Array.isArray(result.result) ? result.result : [result.result];
      let created = 0;
      let skipped = 0;
      for (const file of files) {
        const text = await readTextFile(file.uri);
        const fallbackTitle = (file.name || '导入笔记').replace(/\.(md|markdown|txt)$/i, '');
        const r = await importMarkdownNote(text, fallbackTitle);
        if (r.created) {
          created += 1;
        } else {
          skipped += 1;
        }
      }

      if (created === 0) {
        Alert.alert('导入提示', skipped > 0 ? '所选文件均为空内容，未导入任何笔记' : '未导入任何笔记');
        return;
      }
      const msg = `成功导入 ${created} 篇笔记${skipped > 0 ? `，跳过 ${skipped} 篇空文件` : ''}`;
      showToast(msg, 'success');
    } catch (e) {
      Alert.alert('导入失败', (e as Error).message || '无法读取所选文件');
    } finally {
      setImporting(false);
    }
  }, [importing, showToast]);

  // 简单分组渲染
  const group = (
    title: string,
    rows: React.ReactNode,
  ) => (
    <View key={title}>
      <GroupTitle title={title} />
      <View style={[styles.section, { borderColor: colors.border }]}>{rows}</View>
    </View>
  );

  return (
    <AuroraBackground style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>设置</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>应用偏好与配置</Text>
      </View>

      {/* 主题分段 */}
      <View style={styles.themeWrap}>
        <ThemeToggle isDark={isDark} onToggleTheme={toggleTheme} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {group('AI 服务', (
          <>
            <CardRowShell onPress={openAISettings}>
              <CardRowContent icon="ai" title="问墨 · AI 服务配置" subtitle={`${providerLabel} · ${noApiKey ? '未配置 API Key' : '已配置'}`} />
            </CardRowShell>
            <CardRowShell showArrow={false} right={<ToggleSwitch value={autoClassify} onValueChange={setAutoClassify} />}>
              <CardRowContent icon="check" title="保存后自动分类" subtitle="打标签并进入待确认" />
            </CardRowShell>
          </>
        ))}
        {group('账号与同步', (
          <>
            <CardRowShell onPress={() => Alert.alert('本地模式', '当前为本地模式，数据仅保存在本机')}>
              <CardRowContent icon="user" title="本地模式" subtitle="无需账号 · 数据在本机" />
            </CardRowShell>
            <CardRowShell onPress={handleExportData}>
              <CardRowContent icon="download" title={exporting ? '导出中...' : '导出数据'} subtitle="生成 Markdown · 分享或保存全部笔记/待办" />
            </CardRowShell>
            <CardRowShell onPress={handleImportData}>
              <CardRowContent icon="clip" title={importing ? '导入中...' : '导入 Markdown'} subtitle="从 .md 文件导入笔记" />
            </CardRowShell>
          </>
        ))}
        {group('数据', (
          <>
            <CardRowShell onPress={openFolders}>
              <CardRowContent icon="folder" title="文件夹管理" subtitle="工作 · 学习 · 生活 · 收藏夹" />
            </CardRowShell>
            <CardRowShell onPress={openFavorites}>
              <CardRowContent icon="star" title="收藏" subtitle={`${notesCount} 条笔记`} />
            </CardRowShell>
            <CardRowShell onPress={openTrash}>
              <CardRowContent icon="trash" title="回收站" subtitle="30 天后自动清理" />
            </CardRowShell>
          </>
        ))}
        {group('通知', (
          <>
            <CardRowShell showArrow={false} right={<ToggleSwitch value={notify} onValueChange={setNotify} />}>
              <CardRowContent icon="bell" title="待办提醒" subtitle="到点发送系统通知" />
            </CardRowShell>
          </>
        ))}
        {group('存储', (
          <StorageCard
            used={storage.used}
            total={storage.total}
            cacheSize={storage.cacheSize}
            onClearCache={storage.cacheSize > 0 ? handleClearCache : undefined}
          />
        ))}
        {group('关于', (
          <>
            <CardRowShell showArrow={false} right={<Text style={[styles.version, { color: colors.textSecondary }]}>v0.1.0</Text>}>
              <CardRowContent icon="info" title="关于 note·demo" />
            </CardRowShell>
            <CardRowShell onPress={() => Alert.alert('反馈', '意见与反馈（预留）')}>
              <CardRowContent icon="help" title="意见与反馈" subtitle="告诉我们你的想法" />
            </CardRowShell>
          </>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textDisabled }]}>
            note-demo · AI 智能笔记助手
          </Text>
        </View>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  themeWrap: {
    paddingVertical: spacing.m,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.m,
  },
  section: {
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  version: {
    fontSize: fontSize.caption,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.small,
  },
});
