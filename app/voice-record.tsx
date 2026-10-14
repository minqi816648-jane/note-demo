import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../src/theme';
import { useHeaderTopInset } from '../src/hooks/useSafeArea';
import { useVoiceRecorder } from '../src/hooks/useVoiceRecorder';
import { useNoteStore } from '../stores/noteStore';

export default function VoiceRecordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const { createNote } = useNoteStore();
  const recorder = useVoiceRecorder();
  const [submitting, setSubmitting] = useState(false);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleRecord = useCallback(async () => {
    if (recorder.isRecording) {
      await recorder.cancel();
      return;
    }
    const ok = await recorder.start();
    if (!ok) {
      Alert.alert('权限', '需要麦克风权限才能录音');
    }
  }, [recorder]);

  const handleSave = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 先创建一篇空笔记，再关联录音
      const empty = await createNote({
        title: `语音笔记 ${new Date().toLocaleTimeString()}`,
        content: '',
        content_text: '（语音录音待处理）',
      });
      const result = await recorder.stop(empty.id);
      if (!result) {
        setSubmitting(false);
        return;
      }
      Alert.alert('已保存', '语音记录已保存到笔记', [
        { text: '好的', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
      setSubmitting(false);
    }
  }, [submitting, recorder, createNote, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>🎤 语音记录</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        {/* 录音状态 */}
        <View style={styles.statusArea}>
          <View
            style={[
              styles.recordCircle,
              {
                borderColor: recorder.isRecording ? colors.danger : colors.primary,
                backgroundColor: recorder.isRecording ? colors.danger + '22' : colors.card,
              },
            ]}
          >
            {recorder.isRecording && <View style={[styles.recordDot, { backgroundColor: colors.danger }]} />}
          </View>

          <Text style={[styles.statusText, { color: colors.textPrimary }]}>
            {recorder.isRecording
              ? `正在录音 ${formatDuration(recorder.duration)}`
              : recorder.isSaving
              ? '正在保存...'
              : '点击按钮开始录音'}
          </Text>
        </View>

        {/* 录音按钮 */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            { backgroundColor: recorder.isRecording ? colors.danger : colors.primary },
          ]}
          onPress={handleRecord}
          activeOpacity={0.8}
        >
          <Text style={styles.recordButtonText}>
            {recorder.isRecording ? '■ 停止' : '● 开始录音'}
          </Text>
        </TouchableOpacity>

        {/* 保存 */}
        {recorder.isRecording && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.success }]}
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>保存笔记</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.hint, { color: colors.textDisabled }]}>
          最长可录制 10 分钟，结束后可转文字
        </Text>
      </View>
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
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.body,
  },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
  },
  statusArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  recordCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  recordDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  statusText: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
  },
  recordButton: {
    width: 180,
    borderRadius: radius.l,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  saveButton: {
    width: 180,
    borderRadius: radius.l,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  hint: {
    fontSize: fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.l,
    paddingHorizontal: spacing.l,
  },
});
