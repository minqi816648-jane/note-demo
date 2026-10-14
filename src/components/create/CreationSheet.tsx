import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';
import { useNoteStore } from '../../../stores/noteStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useRippleRing, useSealPulse } from '../../animations';
import { syncFtsForNote, autoClassifyNote, classifyNote, confirmNoteClassification, CategoryService, NoteService, AttachmentService } from '../../../services';
import type { ClassificationResult } from '../../../services/ai';
import { htmlToText } from '../../utils/html';
import { persistAttachmentFile } from '../../utils/attachmentStorage';
import { pickImageFromLibrary, takePhoto } from '../../utils/image';
import { saveNoteImage } from '../../utils/noteAttachments';
import { CategoryIcon } from '../common/CategoryIcon';
import type { Note, Category } from '../../constants/theme';

type SheetState = 'initial' | 'recording' | 'classifying';

export type CreationInitialState = SheetState;

interface CreationSheetProps {
  visible: boolean;
  initialState?: CreationInitialState;
  onClose: () => void;
}

interface GridItemDef {
  key: string;
  icon: string;
  label: string;
  hint: string;
  action: () => void;
}

/**
 * 「记一笔」半屏创作浮层（定稿 · 三态）
 * 初始态：速记条 + 六宫格 + AI 自动分类开关
 * 录音态 / AI 归类态：预留切换，逐步接入
 */
export function CreationSheet({ visible, initialState = 'initial', onClose }: CreationSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { createNote } = useNoteStore();
  const { autoClassify, setAutoClassify } = useSettingsStore();

  const [state, setState] = useState<SheetState>('initial');
  const [quickText, setQuickText] = useState('');
  const [saving, setSaving] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const recorder = useVoiceRecorder();

  // 实时转写：录音过程中逐句填入（ASR 回调接入点），UI 先行占位并模拟光标。
  // 光标闪烁用 setState + interval 实现，避免在冻结构件上挂 Animated.Value 触发
  // "_tracking ... frozen" 报错（React 19 strict/fast-refresh）。
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    setTranscribing(recorder.isRecording);
    if (!recorder.isRecording) {
      setCursorOn(true);
      return;
    }
    const t = setInterval(() => setCursorOn((v) => !v), 480);
    return () => clearInterval(t);
  }, [recorder.isRecording]);

  // 打开时若要求录音态，直接进入并自动开始录音
  const recordingStartedRef = useRef(false);
  useEffect(() => {
    if (visible && initialState === 'recording' && !recordingStartedRef.current) {
      recordingStartedRef.current = true;
      setState('recording');
      recorder.start().then((ok) => {
        if (!ok) {
          // 无麦克风权限：退回初始态
          setState('initial');
          onClose();
        }
      });
    } else if (!visible) {
      // 关闭时重置标记
      recordingStartedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialState]);

  // 录音态墨团呼吸动画
  // 注意：使用 useNativeDriver:false（JS 驱动）规避 RN dev 模式下
  // "_tracking ... frozen" 报错（native driver 结束时写回 frozen 节点）。
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (visible && state === 'recording') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: false }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible, state, pulse]);

  // 录音双层涟漪 + 印章脉冲
  const rippleRing1 = useRippleRing(false, 0);
  const rippleRing2 = useRippleRing(false, 600);
  const sealPulse = useSealPulse();

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const dismiss = useCallback(() => {
    setQuickText('');
    setState('initial');
    onClose();
  }, [onClose]);

  // 关闭浮层时确保停止录音（cancel 为稳定引用，避免 recorder 新对象导致循环）
  useEffect(() => {
    if (!visible) {
      recorder.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, recorder.cancel]);

  // ===== 态三：AI 归类确认 =====
  const [classifyNoteId, setClassifyNoteId] = useState<string | null>(null);
  const [classifyTitle, setClassifyTitle] = useState('');
  const [menuCategories, setMenuCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [newTag, setNewTag] = useState('');
  const [classifying, setClassifying] = useState(false);

  // 载入系统分类（供态三 chips）
  useEffect(() => {
    if (visible && state === 'classifying' && menuCategories.length === 0) {
      CategoryService.getSystemCategories().then((list) => setMenuCategories(list)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, state]);

  // 保存后尝试获取 AI 归类建议；有建议进入态三，否则后台分类后关闭
  const attemptClassifyAndShow = useCallback(
    async (noteId: string, text: string) => {
      if (!autoClassify) {
        dismiss();
        return;
      }
      setClassifying(true);
      try {
        // 隐私承诺：敏感笔记禁止发送到 AI（无论是否进入态三确认流程）
        const note = await NoteService.getNoteById(noteId).catch(() => null);
        if (note?.is_sensitive === 1) {
          dismiss();
          return;
        }
        const result = await classifyNote(text);
        if (result) {
          setClassifyNoteId(noteId);
          setClassifyTitle(text.slice(0, 40) || '新笔记');
          setSelectedCategory(result.categoryId || null);
          setPendingTags(result.tags || []);
          setSummaryText(result.summary || '');
          setState('classifying');
        } else {
          // 无 API Key 或失败：后台分类并直接关闭
          autoClassifyNote(noteId, text).catch(() => {});
          dismiss();
        }
      } catch {
        autoClassifyNote(noteId, text).catch(() => {});
        dismiss();
      } finally {
        setClassifying(false);
      }
    },
    [autoClassify, dismiss]
  );

  const addPendingTag = useCallback(() => {
    const t = newTag.trim();
    if (t && !pendingTags.includes(t)) {
      setPendingTags((prev) => [...prev, t]);
    }
    setNewTag('');
  }, [newTag, pendingTags]);

  const removePendingTag = useCallback((tag: string) => {
    setPendingTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // 确认归档
  const confirmClassify = useCallback(async () => {
    if (!classifyNoteId || classifying) return;
    setClassifying(true);
    try {
      await confirmNoteClassification(classifyNoteId, selectedCategory, pendingTags);
      await NoteService.updateNote(classifyNoteId, { ai_summary: summaryText || null });
      await syncFtsForNote(classifyNoteId);
      Alert.alert('已归档', '笔记已保存到对应分类');
      setState('initial');
      onClose();
    } catch (error) {
      Alert.alert('归档失败', (error as Error).message);
    } finally {
      setClassifying(false);
    }
  }, [classifyNoteId, selectedCategory, pendingTags, summaryText, classifying, onClose]);

  // 进入录音态并开始录音
  const startVoice = useCallback(async () => {    const ok = await recorder.start();
    if (!ok) {
      Alert.alert('权限', '需要麦克风权限才能录音');
      return;
    }
    setState('recording');
  }, [recorder]);

  // 保存录音并关闭
  const saveVoice = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const title = `语音笔记 ${new Date().toLocaleTimeString()}`;
      const empty = await createNote({
        title,
        content: '',
        content_text: '（语音录音待处理）',
      });
      const result = await recorder.stop(empty.id);
      if (!result) {
        Alert.alert('提示', '未能保存录音');
        setSaving(false);
        return;
      }
      if (autoClassify) {
        autoClassifyNote(empty.id, empty.content_text).catch(() => {});
      }
      Alert.alert('已保存', '语音记录已保存到笔记', [{ text: '好的' }]);
      dismiss();
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [saving, createNote, recorder, autoClassify, dismiss]);

  // 放弃录音
  const discardVoice = useCallback(() => {
    recorder.cancel();
    setState('initial');
  }, [recorder]);

  // 速记：回车即存为文字笔记
  const handleQuickSave = useCallback(async () => {
    const text = quickText.trim();
    if (!text || saving) return;

    setSaving(true);
    try {
      const note: Note = await createNote({
        title: '',
        content: '',
        content_text: text,
      });
      await syncFtsForNote(note.id);
      setQuickText('');
      await attemptClassifyAndShow(note.id, text);
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [quickText, saving, attemptClassifyAndShow, createNote]);

  const goRoute = useCallback(
    (path: string) => {
      dismiss();
      router.push(path);
    },
    [dismiss, router]
  );

  // 「附件」：选文件 → 创建笔记 → 写入附件记录 → 进编辑页
  const pickFileAndCreate = useCallback(async () => {
    try {
      const result = await File.pickFileAsync({
        mimeTypes: [
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain', 'application/*',
        ],
      });
      if (result.canceled || !result.result) return;

      const file = result.result;

      // 先创建笔记（空正文，标题取文件名）
      const note = await createNote({
        title: file.name,
        content: '',
        content_text: '',
      });

      // 持久化文件到 attachments/
      const filePath = await persistAttachmentFile(
        file.uri,
        file.type || 'application/octet-stream',
      );

      // 写入附件 DB 记录
      await AttachmentService.createAttachment({
        note_id: note.id,
        type: 'file',
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        title: file.name,
      });

      dismiss();
      router.push(`/note/${note.id}/edit`);
    } catch (error) {
      Alert.alert('添加附件失败', (error as Error).message);
    }
  }, [createNote, dismiss, router]);

  // 「拍照·图片」：弹出图片来源选择 → 拍照/相册 → 持久化图片 → 进编辑页插入
  const pickImageAndCreate = useCallback(
    async (source: 'camera' | 'library') => {
      try {
        const image = source === 'camera' ? await takePhoto() : await pickImageFromLibrary();
        if (!image) return;
        // 先持久化图片文件，不绑定 noteId（noteId 为空串），进编辑页后由编辑器插入
        const filePath = await saveNoteImage(image, null);
        dismiss();
        router.push({
          pathname: '/note/edit',
          params: { imagePath: filePath },
        });
      } catch (error) {
        Alert.alert('添加图片失败', (error as Error).message);
      }
    },
    [dismiss, router]
  );

  // 「截屏」：全局截屏 → 存为图片笔记 → 进详情页
  const [capturingScreen, setCapturingScreen] = useState(false);
  const captureScreenAndSave = useCallback(async () => {
    if (capturingScreen) return;
    setCapturingScreen(true);
    try {
      const { captureToImageNote } = await import('../../../services/screenCapture.service');
      const { noteId } = await captureToImageNote();
      dismiss();
      router.push(`/note/${noteId}`);
    } catch (error) {
      Alert.alert('截屏失败', (error as Error).message);
    } finally {
      setCapturingScreen(false);
    }
  }, [capturingScreen, dismiss, router]);

  const gridItems: GridItemDef[] = [
    { key: 'text', icon: '📝', label: '文字', hint: '富文本 · 代码块', action: () => goRoute('/note/edit') },
    { key: 'image', icon: '📷', label: '拍照·图片', hint: 'AI 识图 · OCR', action: () => setImagePickerVisible(true) },
    { key: 'voice', icon: '🎙️', label: '语音', hint: '≤10分钟转文字', action: () => startVoice() },
    { key: 'attach', icon: '📎', label: '附件', hint: 'PDF · Word · txt', action: () => pickFileAndCreate() },
    { key: 'link', icon: '🔗', label: '链接', hint: '收藏链接 · 抓取预览', action: () => goRoute('/link/new') },
    { key: 'todo', icon: '✅', label: '待办', hint: '提醒 · 优先级', action: () => goRoute('/todo/new') },
    { key: 'screenshot', icon: '🖥️', label: '截屏', hint: '全局截屏存笔记', action: () => captureScreenAndSave() },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <TouchableOpacity style={styles.mask} onPress={dismiss} activeOpacity={1} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.handle} />

        {state === 'initial' && (
          <>
            <View style={styles.sheetHeader}>
              <Animated.View style={[styles.sealMini, { backgroundColor: colors.primary }, sealPulse]}>
                <Text style={styles.sealText}>记</Text>
              </Animated.View>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>记一笔</Text>
            </View>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>先想到什么，就记什么</Text>

            {/* 速记条 */}
            <View style={[styles.quickRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.quickInput, { color: colors.textPrimary }]}
                placeholder="随手敲几个字，回车即保存…"
                placeholderTextColor={colors.textDisabled}
                value={quickText}
                onChangeText={setQuickText}
                returnKeyType="done"
                onSubmitEditing={handleQuickSave}
              />
              <TouchableOpacity
                style={[styles.quickGo, { backgroundColor: colors.primary }]}
                onPress={handleQuickSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.quickGoText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 六宫格 */}
            <View style={styles.grid}>
              {gridItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gridIcon, { backgroundColor: colors.card }]}>
                    <Text style={styles.gridIconText}>{item.icon}</Text>
                  </View>
                  <Text style={[styles.gridLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.gridHint, { color: colors.textDisabled }]} numberOfLines={1}>
                    {item.hint}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AI 自动分类开关 */}
            <TouchableOpacity
              style={[styles.aiToggleRow, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setAutoClassify(!autoClassify)}
              activeOpacity={0.7}
            >
              <Text style={styles.aiToggleIcon}>✨</Text>
              <Text style={[styles.aiToggleText, { color: colors.textSecondary }]}>
                保存后由 AI 自动分类、打标签
              </Text>
              <View style={[styles.toggleTrack, { backgroundColor: autoClassify ? colors.primary : colors.border }]}>
                <View style={[styles.toggleThumb, { transform: [{ translateX: autoClassify ? 14 : 0 }] }]} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {state === 'recording' && (
          <View style={styles.recordWrap}>
            <View style={[styles.sheetHeader, { marginTop: spacing.xs }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>语音速记</Text>
            </View>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {recorder.isRecording ? '正在录音' : recorder.isSaving ? '正在保存...' : '录音结束'}
            </Text>

            {/* 朱砂墨团呼吸 + 双层涟漪 */}
            <View style={styles.recOrbWrap}>
              <Animated.View
                style={[
                  styles.recRipple,
                  { borderColor: colors.primary },
                  rippleRing1,
                ]}
              />
              <Animated.View
                style={[
                  styles.recRipple,
                  styles.recRippleDelayed,
                  { borderColor: colors.primary },
                  rippleRing2,
                ]}
              />
              <Animated.View
                style={[
                  styles.recOrb,
                  { backgroundColor: colors.primary, transform: [{ scale: pulse }] },
                ]}
              >
                <Text style={styles.recOrbIcon}>🎙️</Text>
              </Animated.View>
            </View>

            {/* 计时 */}
            <Text style={[styles.recTime, { color: colors.textPrimary }]}>
              {formatDuration(recorder.duration)}
            </Text>
            <Text style={[styles.recStat, { color: colors.primary }]}>
              {recorder.isRecording ? '录 音 中' : recorder.isSaving ? '保 存 中' : '已 停 止'}
            </Text>

            {/* 实时转写区（ASR 回调接入点；UI 先占位，光标闪烁不阻塞主线程） */}
            <View
              style={[
                styles.recTranscript,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {transcribing && (
                <Text style={[styles.recTranscriptTag, { color: colors.primary }]}>
                  实时转写中...
                </Text>
              )}
              <Text style={[styles.recTranscriptText, { color: colors.textPrimary }]} selectable>
                {transcript !== '' ? transcript : '（未生成转写）'}
                {transcribing && cursorOn && <Text>|</Text>}
              </Text>
            </View>

            {/* 三键 */}
            <View style={styles.recActions}>
              <TouchableOpacity
                style={[styles.recActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={discardVoice}
                disabled={recorder.isSaving || saving}
              >
                <Text style={[styles.recActionLabel, { color: colors.textSecondary }]}>放弃</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.recDoneBtn, { backgroundColor: colors.primary }]}
                onPress={saveVoice}
                disabled={recorder.isSaving || saving || (recorder.duration <= 0 && recorder.isRecording)}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.recDoneText}>{recorder.isRecording ? '完成' : '保存'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.recActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={saveVoice}
                disabled={recorder.isSaving || saving || (recorder.duration <= 0 && recorder.isRecording)}
              >
                <Text style={[styles.recActionLabel, { color: colors.danger }]}>停止</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.recHint, { color: colors.textDisabled }]}>
              最长可录 10 分钟，完成后存为语音笔记
            </Text>
          </View>
        )}

        {state === 'classifying' && (
          <View style={styles.clsWrap}>
            <View style={[styles.sheetHeader, { marginTop: spacing.xs }]}>
              <Animated.View style={[styles.sealMini, { backgroundColor: colors.primary }, sealPulse]}>
                <Text style={styles.sealText}>归</Text>
              </Animated.View>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>问墨来归类</Text>
            </View>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>AI 建议可直接确认或修改</Text>

            {/* 笔记标题 */}
            <View style={[styles.clsNoteBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.clsNoteIcon}>📝</Text>
              <Text style={[styles.clsNoteTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {classifyTitle}
              </Text>
            </View>

            {/* 分类 chips */}
            <Text style={[styles.clsLabel, { color: colors.textSecondary }]}>分类</Text>
            <View style={styles.chipsWrap}>
              {menuCategories.map((cat) => {
                const active = cat.slug === selectedCategory;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.clsChip,
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setSelectedCategory(active ? null : cat.slug)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clsChipInner}>
                      <CategoryIcon category={cat} size={15} color={active ? '#FFF' : colors.textPrimary} />
                      <Text style={[styles.clsChipText, { color: active ? '#FFF' : colors.textPrimary, marginLeft: 5 }]}>
                        {cat.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 标签 chips */}
            <Text style={[styles.clsLabel, { color: colors.textSecondary }]}>标签</Text>
            <View style={styles.chipsWrap}>
              {pendingTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.clsChip, styles.clsChipTag, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => removePendingTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clsChipText, { color: colors.textPrimary }]}>#{tag} ✕</Text>
                </TouchableOpacity>
              ))}
              <View style={[styles.clsTagInputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.clsTagInput, { color: colors.textPrimary }]}
                  placeholder="+ 加标签"
                  placeholderTextColor={colors.textDisabled}
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={addPendingTag}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* 摘要 */}
            <Text style={[styles.clsLabel, { color: colors.textSecondary }]}>摘要</Text>
            <TextInput
              style={[styles.clsSummary, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
              value={summaryText}
              onChangeText={setSummaryText}
              multiline
              maxLength={300}
            />

            {/* 确认 */}
            <View style={styles.clsBtnRow}>
              <TouchableOpacity
                style={[styles.clsBtn, { borderColor: colors.border }]}
                onPress={() => setState('initial')}
                activeOpacity={0.7}
              >
                <Text style={[styles.clsBtnText, { color: colors.textSecondary }]}>调整</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.clsBtn, styles.clsBtnGo, { backgroundColor: colors.primary }]}
                onPress={confirmClassify}
                disabled={classifying}
                activeOpacity={0.7}
              >
                {classifying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.clsBtnGoText}>确认归档</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.footNote, { color: colors.textDisabled }]}>按住下方「＋」可直接语音速记</Text>
      </View>

      {/* 「拍照·图片」来源选择浮层 */}
      <Modal visible={imagePickerVisible} transparent animationType="fade" onRequestClose={() => setImagePickerVisible(false)}>
        <TouchableOpacity style={styles.imageMask} onPress={() => setImagePickerVisible(false)} activeOpacity={1} />
        <View style={[styles.imageSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.imageSheetTitle, { color: colors.textPrimary }]}>插入图片</Text>

          <TouchableOpacity
            style={[styles.imageOption, { borderBottomColor: colors.border }]}
            onPress={() => {
              setImagePickerVisible(false);
              pickImageAndCreate('camera');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.imageOptionIcon}>📷</Text>
            <Text style={[styles.imageOptionLabel, { color: colors.textPrimary }]}>拍照</Text>
            <Text style={styles.imageOptionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.imageOption, { borderBottomColor: colors.border }]}
            onPress={() => {
              setImagePickerVisible(false);
              pickImageAndCreate('library');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.imageOptionIcon}>🖼️</Text>
            <Text style={[styles.imageOptionLabel, { color: colors.textPrimary }]}>从相册选择</Text>
            <Text style={styles.imageOptionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.imageCancel, { borderTopColor: colors.border }]}
            onPress={() => setImagePickerVisible(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.imageCancelText, { color: colors.danger }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.l,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#D8CDB6',
    alignSelf: 'center',
    marginVertical: spacing.s,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    marginTop: spacing.xs,
  },
  sealMini: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
  },
  sealText: {
    color: '#F6F1E6',
    fontFamily: 'serif',
    fontSize: 12,
    fontWeight: '900',
    transform: [{ rotate: '-4deg' }],
  },
  sheetTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.heavy,
    letterSpacing: 2,
  },
  sub: {
    fontSize: fontSize.small,
    letterSpacing: 2,
    marginTop: 2,
    paddingHorizontal: spacing.m,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
  },
  quickInput: {
    flex: 1,
    fontSize: fontSize.body,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  quickGo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickGoText: {
    color: '#FFF',
    fontSize: fontSize.subtitle,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.m,
    marginTop: spacing.m,
  },
  gridItem: {
    width: '31%',
    marginRight: '3.5%',
    marginBottom: spacing.s,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  gridIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridIconText: {
    fontSize: 18,
  },
  gridLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  gridHint: {
    fontSize: fontSize.small - 2,
    marginTop: 2,
  },
  aiToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aiToggleIcon: {
    fontSize: fontSize.caption,
    marginRight: spacing.s,
  },
  aiToggleText: {
    flex: 1,
    fontSize: fontSize.caption,
  },
  toggleTrack: {
    width: 34,
    height: 19,
    borderRadius: 99,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 15,
    height: 15,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  stateEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.l,
  },
  recCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  recIcon: {
    fontSize: 30,
  },
  recordWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xs,
  },
  recOrbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  recRipple: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
  },
  recRippleDelayed: {
    // 双层涟漪外层略大，形成错层扩散
  },
  recOrb: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recOrbIcon: {
    fontSize: 32,
  },
  recTime: {
    fontSize: 30,
    fontFamily: 'serif',
    fontWeight: '700',
    letterSpacing: 1,
  },
  recStat: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    letterSpacing: 4,
    marginTop: spacing.xs,
  },
  recTranscript: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  recTranscriptTag: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  recTranscriptText: {
    fontSize: fontSize.caption,
    lineHeight: 18,
  },
  recActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    marginTop: spacing.l,
  },
  recActionBtn: {
    width: 56,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  recActionLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  recDoneBtn: {
    width: 64,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDoneText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  recHint: {
    fontSize: fontSize.small,
    marginTop: spacing.l,
  },
  clsWrap: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xs,
  },
  clsNoteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.s,
    marginTop: spacing.s,
  },
  clsNoteIcon: {
    fontSize: fontSize.caption,
    marginRight: spacing.s,
  },
  clsNoteTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  clsLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginTop: spacing.m,
    marginBottom: spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  clsChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  clsChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clsChipTag: {
    borderStyle: 'dashed',
  },
  clsChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  clsTagInputRow: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
  },
  clsTagInput: {
    minWidth: 70,
    fontSize: fontSize.caption,
    paddingVertical: 4,
  },
  clsSummary: {
    minHeight: 70,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    fontSize: fontSize.body,
    textAlignVertical: 'top',
  },
  clsBtnRow: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.m,
  },
  clsBtn: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  clsBtnGo: {
    borderWidth: 0,
  },
  clsBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  clsBtnGoText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  stateTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.s,
  },
  stateDesc: {
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.l,
  },
  stateBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.s,
    borderRadius: radius.full,
  },
  stateBtnText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  imageMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  imageSheet: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.xl,
    width: '84%',
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingBottom: spacing.xs,
  },
  imageSheetTitle: {
    textAlign: 'center',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    paddingVertical: spacing.m,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  imageOptionIcon: {
    fontSize: fontSize.body,
    marginRight: spacing.s,
  },
  imageOptionLabel: {
    flex: 1,
    fontSize: fontSize.body,
  },
  imageOptionArrow: {
    fontSize: fontSize.subtitle,
    color: '#B8AF9C',
  },
  imageCancel: {
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  imageCancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  footNote: {
    textAlign: 'center',
    fontSize: fontSize.small,
    letterSpacing: 2,
    marginTop: spacing.s,
  },
});
