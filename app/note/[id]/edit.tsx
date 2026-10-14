import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { File } from 'expo-file-system';
import { useTheme } from '../../../src/theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../../src/theme';
import { useHeaderTopInset } from '../../../src/hooks/useSafeArea';
import { RichTextEditor, RichTextEditorRef, EditorToolbar, EditMoreMenu, InsertStatsStrip } from '../../../src/components/editor';
import { SaveStatus } from '../../../src/components/editor/SaveStatus';
import { EditorFooter } from '../../../src/components/editor/EditorFooter';
import { ConfirmDialog } from '../../../src/components/common';
import type { EditorSaveState } from '../../../src/components/editor/SaveStatus';
import { useNoteStore } from '../../../stores/noteStore';
import { NoteService, TagService, autoClassifyNote, syncFtsForNote } from '../../../services';
import { htmlToText, sanitizeRichHtml } from '../../../src/utils/html';
import { formatRelativeTime, formatDateTime } from '../../../src/utils/date';
import { pickImageFromLibrary, takePhoto } from '../../../src/utils/image';
import { saveNoteImage, syncNoteAttachments, purgeInsertedFiles, persistFileAttachment, getNoteAttachments } from '../../../src/utils/noteAttachments';
import { buildMediaCardHtml, countMediaBlocks } from '../../../src/utils/mediaCards';
import { useSettingsStore } from '../../../stores/settingsStore';
import { AIActionsBar } from '../../../src/components/ai/AIActionsBar';
import { AskInkButton } from '../../../src/components/ai/AskInkButton';
import type { Note, Tag } from '../../../src/constants/theme';

/** 根据设置决定是否异步执行 AI 分类 */
function triggerAutoClassify(noteId: string, contentText: string, manualCategoryId: string | null) {
  const { autoClassify } = useSettingsStore.getState();
  if (!autoClassify || manualCategoryId) return;
  autoClassifyNote(noteId, contentText).catch(() => {});
}

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 根据文件名返回图标标签（PDF/TXT/DOC/...) */
function extLabel(name: string): string {
  const m = /\.([a-zA-Z0-9]{2,5})$/.exec(name || '');
  if (!m) return '附件';
  const ext = m[1].toUpperCase();
  if (ext === 'DOCX' || ext === 'DOC') return 'DOC';
  if (ext === 'XLSX' || ext === 'XLS') return 'XLS';
  if (ext === 'PPTX' || ext === 'PPT') return 'PPT';
  if (['TXT', 'MD'].includes(ext)) return 'TXT';
  if (ext.length > 4) return '文件';
  return ext;
}

/**
 * 笔记编辑页（统一新建 / 编辑）
 * /note/[id]/edit —— id 存在=编辑既有笔记；id 为空=新建草稿
 */
export default function EditNoteScreen() {
  const { id, imagePath } = useLocalSearchParams<{ id: string; imagePath?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const { createNote, updateNote, folders, categories, tags, fetchFolders, fetchCategories, fetchTags, addTagToNote, removeTagFromNote, deleteNote } = useNoteStore();

  const isNew = !id?.trim();

  const editorRef = useRef<RichTextEditorRef>(null);
  // 记录本次编辑会话新插入的图片文件路径（取消编辑时用于清理孤立文件）
  const insertedPathsRef = useRef<string[]>([]);
  // 本次会话新插入的文件附件的文件路径（取消编辑时清理孤立文件）
  const insertedFilePathsRef = useRef<string[]>([]);
  // 新建模式下，首次保存后的笔记 ID（草稿）
  const noteIdRef = useRef<string | null>(isNew ? null : id || null);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const contentRef = useRef('');
  const setContentBoth = useCallback((html: string) => {
    contentRef.current = html;
    setContent(html);
  }, []);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [noteTags, setNoteTags] = useState<Tag[]>([]);
  const [addedFilesCount, setAddedFilesCount] = useState(0);
  // 本次会话已附加的文件（用于编辑页可视预览/点击跳转）
  const [addedFiles, setAddedFiles] = useState<{ id: string; name: string; path: string; sizeText: string; ext: string }[]>([]);
  // 自动保存状态机
  const [saveState, setSaveState] = useState<EditorSaveState>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 通用确认弹窗状态（放弃编辑 / 删除笔记）
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // 加载笔记（编辑态）和元数据
  useEffect(() => {
    if (!isNew) {
      loadNote();
      loadNoteTags();
    }
    fetchFolders();
    fetchCategories();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 新建笔记时，若带 imagePath 参数（来自「拍照·图片」），编辑器就绪后插入该图片卡片
  useEffect(() => {
    if (!isNew || !imagePath) return;
    const t = setTimeout(() => {
      if (editorRef.current) {
        // 交由编辑器 onChange 更新 content 状态
        insertedPathsRef.current.push(imagePath);
        const stats = countMediaBlocks(contentRef.current);
        editorRef.current.insertHTMLBlock(
          buildMediaCardHtml('image', { src: imagePath }, stats.image + 1)
        );
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, imagePath]);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const noteData = await NoteService.getNoteById(id);
      if (noteData) {
        setNote(noteData);
        setTitle(noteData.title || '');
        setContentBoth(noteData.content || '');
        setFolderId(noteData.parent_id);
        setCategoryId(noteData.category_id);
        setIsSensitive(noteData.is_sensitive === 1);
        // 加载既有文件附件用于编辑页可视预览
        (async () => {
          try {
            const atts = await getNoteAttachments(id);
            const files = atts
              .filter((a) => a.type === 'file')
              .map((a) => ({ id: a.id, name: a.file_name, path: a.file_path, sizeText: formatBytes(a.file_size), ext: extLabel(a.file_name) }));
            setAddedFiles(files);
          } catch (e) {
            console.error('load note files failed:', e);
          }
        })();
        setTimeout(() => {
          // 消毒后再进编辑器，阻断存储型 XSS
          editorRef.current?.setHTML(sanitizeRichHtml(noteData.content || ''));
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      Alert.alert('加载失败', '无法加载笔记内容');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadNoteTags = useCallback(async () => {
    if (!id) return;
    try {
      const tagsForNote = await TagService.getTagsByNoteId(id);
      setNoteTags(tagsForNote);
    } catch (error) {
      console.error('Failed to load note tags:', error);
    }
  }, [id]);

  // 保存封装：新建=首次 create 后 update；编辑=update
  const persistNote = useCallback(
    async ({ finalize = false }: { finalize?: boolean } = {}) => {
      if (isSaving) return;
      const rawHtml = await editorRef.current?.getHTML() || '';
      // 持久化前消毒，防止粘贴/外部内容把可执行 HTML 写入 content
      const html = sanitizeRichHtml(rawHtml);
      const text = htmlToText(html);
      if (!title.trim() && !text.trim()) return;
      setSaveState('saving');
      try {
        let targetId = noteIdRef.current;
        if (!targetId) {
          const created = await createNote({
            title: title.trim(),
            content: html,
            content_text: text,
            parent_id: folderId,
            category_id: categoryId,
            is_sensitive: isSensitive ? 1 : 0,
          });
          targetId = created.id;
          noteIdRef.current = created.id;
        } else {
          await updateNote(targetId, {
            title: title.trim(),
            content: html,
            content_text: text,
            parent_id: folderId,
            category_id: categoryId,
            is_sensitive: isSensitive ? 1 : 0,
          });
        }
        await syncNoteAttachments(html, targetId);
        await syncFtsForNote(targetId);
        setSaveState('saved');
        if (finalize) {
          await NoteService.setClassifyConfirmed(targetId, 1);
          triggerAutoClassify(targetId, text, categoryId);
          router.back();
        }
      } catch (error) {
        setSaveState('failed');
        throw error;
      }
    },
    [isSaving, title, folderId, categoryId, isSensitive, createNote, updateNote, router]
  );

  // 防抖自动保存：输入停止 2s 后触发
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (saveState === 'saving' || saveState === 'failed') return;
    setSaveState('dirty');
    autoSaveTimerRef.current = setTimeout(() => {
      persistNote({ finalize: false }).catch(() => {});
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, folderId, categoryId, isSensitive]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // 选择图片来源并插入
  const handleAddImage = useCallback(() => {
    Alert.alert('插入图片', '选择图片来源', [
      { text: '取消', style: 'cancel' },
      { text: '拍照', onPress: handleTakePhoto },
      { text: '从相册选择', onPress: handlePickFromLibrary },
    ]);
  }, []);

  // 插入一张图片卡片块（带图签）
  const insertImageCard = useCallback((filePath: string) => {
    const stats = countMediaBlocks(contentRef.current);
    const html = buildMediaCardHtml('image', { src: filePath }, stats.image + 1);
    editorRef.current?.insertHTMLBlock(html);
  }, []);

  // 使用相机拍摄图片
  const handleTakePhoto = useCallback(async () => {
    try {
      const image = await takePhoto();
      if (image) {
        const filePath = await saveNoteImage(image, null);
        insertedPathsRef.current.push(filePath);
        insertImageCard(filePath);
      }
    } catch (error) {
      Alert.alert('插入图片失败', (error as Error).message);
    }
  }, [insertImageCard]);

  // 从相册选择图片
  const handlePickFromLibrary = useCallback(async () => {
    try {
      const image = await pickImageFromLibrary();
      if (image) {
        const filePath = await saveNoteImage(image, null);
        insertedPathsRef.current.push(filePath);
        insertImageCard(filePath);
      }
    } catch (error) {
      Alert.alert('插入图片失败', (error as Error).message);
    }
  }, [insertImageCard]);

  // 选择文档/文件附件（PDF/Word/txt 等）并附加到笔记
  const handleAddFile = useCallback(async () => {
    try {
      // 确保笔记已创建（新建模式下首次选文件前先生成 noteId，否则附件无法持久化关联）
      let targetId = noteIdRef.current;
      if (!targetId) {
        await persistNote({ finalize: false });
        targetId = noteIdRef.current;
      }
      if (!targetId) {
        const empty = await createNote({
          title: title.trim() || '无标题笔记',
          content: content,
          content_text: htmlToText(content),
          parent_id: folderId,
          category_id: categoryId,
        });
        noteIdRef.current = empty.id;
        targetId = empty.id;
      }

      const result = await File.pickFileAsync({
        mimeTypes: [
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain', 'application/*',
        ],
      });
      if (result.canceled || !result.result) return;

      const file = result.result;
      const att = await persistFileAttachment({
        sourceUri: file.uri,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        fileSize: file.size,
        noteId: targetId,
        title: file.name,
      });
      insertedFilePathsRef.current.push(att.file_path);
      setAddedFilesCount((prev) => prev + 1);
      setAddedFiles((prev) => [
        ...prev,
        {
          id: att.id,
          name: file.name,
          path: att.file_path,
          sizeText: formatBytes(file.size || 0),
          ext: extLabel(file.name),
        },
      ]);

      Alert.alert('已附加', `已添加附件：${file.name}`);
    } catch (error) {
      Alert.alert('添加附件失败', (error as Error).message);
    }
  }, [persistNote, createNote, title, content, folderId, categoryId]);

  // 插入链接（外部链接）：弹出输入，抓取后内嵌为链接卡片
  const handleAddLink = useCallback(() => {
    Alert.prompt?.(
      '插入链接',
      '粘贴外部链接地址',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '插入',
          onPress: (url?: string) => {
            const trimmed = (url || '').trim();
            if (!trimmed) return;
            const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
            const stats = countMediaBlocks(contentRef.current);
            editorRef.current?.insertHTMLBlock(
              buildMediaCardHtml('link', { url: normalized }, stats.link + 1)
            );
          },
        },
      ],
      'plain-text'
    );
  }, []);

  // 插入录音：跳转语音记录页（完成后独立成笔记）
  const handleAddAudio = useCallback(() => {
    router.push('/voice-record');
  }, [router]);

  // 取消编辑
  const handleCancel = useCallback(() => {
    const hasContent = title || content;
    const doDiscard = () => {
      purgeInsertedFiles(insertedPathsRef.current);
      if (insertedFilePathsRef.current.length > 0) {
        purgeInsertedFiles(insertedFilePathsRef.current);
      }
      router.back();
    };
    if (hasContent) {
      setConfirm({
        title: '放弃编辑',
        message: '确定放弃本次编辑？',
        danger: true,
        confirmLabel: '放弃',
        onConfirm: doDiscard,
      });
    } else {
      doDiscard();
    }
  }, [title, content, router]);

  // 删除笔记
  const handleDelete = useCallback(() => {
    if (!noteIdRef.current) {
      // 尚未创建：直接放弃
      return handleCancel();
    }
    setConfirm({
      title: '删除笔记',
      message: '确定要删除这篇笔记吗？',
      danger: true,
      confirmLabel: '删除',
      onConfirm: async () => {
        try {
          await deleteNote(noteIdRef.current!);
          router.back();
        } catch (e) {
          Alert.alert('删除失败', (e as Error).message);
        }
      },
    });
  }, [deleteNote, handleCancel, router]);

  // 标签开/关
  const handleToggleTag = useCallback(
    async (tagId: string, name: string) => {
      if (!noteIdRef.current) {
        Alert.alert('提示', '请先保存笔记，再管理标签');
        return;
      }
      const nid = noteIdRef.current;
      const has = noteTags.some((t) => t.id === tagId);
      try {
        if (has) {
          await removeTagFromNote(nid, tagId);
          setNoteTags((prev) => prev.filter((t) => t.id !== tagId));
        } else {
          const tag = await addTagToNote(nid, name);
          setNoteTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
        }
      } catch (e) {
        Alert.alert('标签操作失败', (e as Error).message);
      }
    },
    [noteTags, removeTagFromNote, addTagToNote]
  );

  if (isLoading) {
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
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>取消</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isNew ? '新建笔记' : '编辑笔记'}</Text>

        <View style={styles.headerRight}>
          <SaveStatus state={saveState} onRetry={() => persistNote({ finalize: false }).catch(() => {})} />
          {/* 右上角「···」菜单：附件 / 敏感笔记等 */}
          <TouchableOpacity onPress={() => setShowEditMenu(true)} style={styles.menuButton} activeOpacity={0.7}>
            <Text style={[styles.menuButtonText, { color: colors.textPrimary }]}>···</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 砚台工具栏（单行 9 图标，含分组竖线） */}
      <EditorToolbar
        editorRef={editorRef}
        onAddImage={handleAddImage}
        onAddAudio={handleAddAudio}
        onAddFile={handleAddFile}
        onAddLink={handleAddLink}
      />

      {/* AI 快捷操作栏（敏感笔记不上传，隐藏） */}
      {!isSensitive && <AIActionsBar editorRef={editorRef} onContentChanged={setContentBoth} />}

      {/* 最后编辑时间行（工具栏下方 4.1） */}
      {!isNew && note?.updated_at ? (
        <View style={styles.editorMetaRow}>
          <Text style={[styles.editorMetaClock, { color: colors.textSecondary }]}>🕐</Text>
          <Text style={[styles.editorMeta, { color: colors.textSecondary }]}>
            最后编辑 {formatRelativeTime(note.updated_at)}（{formatDateTime(note.updated_at)}）
          </Text>
        </View>
      ) : null}

      {/* 可滚动编辑区：标题 + 富文本（超长内容整体滚动，头部/工具栏保持吸附） */}
      <ScrollView
        style={styles.editScroll}
        contentContainerStyle={styles.editScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        scrollEnabled
      >
        {/* 标题输入 */}
        <TextInput
          style={[styles.titleInput, { color: colors.textPrimary }]}
          placeholder="输入标题..."
          placeholderTextColor={colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          autoFocus={isNew}
        />

        {/* 富文本编辑器 */}
        <View style={styles.editorArea}>
          <RichTextEditor
            ref={editorRef}
            placeholder="开始输入内容..."
            onChange={setContentBoth}
            style={styles.editor}
          />
          {!isSensitive && (
            <AskInkButton editorRef={editorRef} onContentChanged={setContentBoth} />
          )}
        </View>
      </ScrollView>

      {/* 已附加的文件附件（可视预览，点击跳转附件预览页） */}
      {addedFiles.length > 0 && (
        <View style={[styles.addedFiles, { borderTopColor: colors.border }]}>
          {addedFiles.map((f) => (
            <TouchableOpacity
              key={f.path}
              style={[styles.addedFileRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => {
                if (f.id) router.push(`/attachment/${f.id}`);
              }}
            >
              <View style={[styles.addedFileIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.addedFileIconText}>{f.ext}</Text>
              </View>
              <Text style={[styles.addedFileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {f.name}
              </Text>
              {f.sizeText ? (
                <Text style={[styles.addedFileSize, { color: colors.textSecondary }]}>{f.sizeText}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 多媒体插入统计行 */}
      <InsertStatsStrip html={content} />

      {/* 底部操作栏 */}
      <EditorFooter
        saving={isSaving}
        onDiscard={() => {
          if (isSaving) return;
          handleCancel();
        }}
        onSave={() => persistNote({ finalize: true }).catch((e) => Alert.alert('保存失败', (e as Error).message))}
      />

      {/* 右上角「···」三维度菜单 */}
      <EditMoreMenu
        visible={showEditMenu}
        onClose={() => setShowEditMenu(false)}
        top={headerTopInset + 56}
        folders={folders}
        categories={categories}
        tags={tags}
        noteTagIds={noteTags.map((t) => t.id)}
        folderId={folderId}
        categoryId={categoryId}
        isSensitive={isSensitive}
        onSelectFolder={(id) => setFolderId(id)}
        onSelectCategory={(id) => setCategoryId(id)}
        onToggleTag={handleToggleTag}
        onToggleSensitive={(v) => setIsSensitive(v)}
        onAddFile={handleAddFile}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        iconName="trash"
        danger={confirm?.danger}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
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
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.body,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
  },
  menuButtonText: {
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 2,
    fontWeight: fontWeight.semiBold,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
    textAlign: 'center',
  },
  sensitiveBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sensitiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.s,
  },
  sensitiveIcon: {
    fontSize: fontSize.caption,
    marginRight: spacing.s,
  },
  sensitiveLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
  },
  menuMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuPanel: {
    position: 'absolute',
    right: spacing.m,
    minWidth: 220,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  menuIconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.s,
  },
  menuIcon: {
    fontSize: fontSize.caption,
  },
  menuTextWrap: {
    flex: 1,
    marginRight: spacing.s,
  },
  menuLabel: {
    fontSize: fontSize.body,
  },
  menuHint: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  editorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    marginTop: spacing.xs,
  },
  editorMetaClock: {
    fontSize: fontSize.small,
    marginRight: 6,
  },
  editorMeta: {
    fontSize: fontSize.small,
  },
  titleInput: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: fontWeight.heavy,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  editor: {
    minHeight: 300,
  },
  editorArea: {
    minHeight: 300,
  },
  editScroll: {
    flex: 1,
  },
  editScrollContent: {
    flexGrow: 1,
    paddingBottom: 64,
  },
  addedFiles: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  addedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  addedFileIcon: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  addedFileIconText: {
    color: '#FFFFFF',
    fontSize: fontSize.small,
    fontWeight: fontWeight.heavy,
  },
  addedFileName: {
    flex: 1,
    fontSize: fontSize.body,
  },
  addedFileSize: {
    fontSize: fontSize.small,
    marginLeft: spacing.s,
  },
});
