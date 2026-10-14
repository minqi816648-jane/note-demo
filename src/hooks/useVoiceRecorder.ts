import { useCallback, useMemo, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';
import type { RecorderState } from 'expo-audio';

interface SaveResult {
  recordId: string;
}

// voice.service（权限/音效模式/持久化）仅在调用时才动态加载，
// 避免在任何不需要语音的原生环境下提前拉起音频模块。
function loadVoiceService(): Promise<typeof import('../../services/voice.service')> {
  return import('../../services/voice.service');
}

/**
 * 语音录制 Hook（基于 expo-audio）。
 * 录音实例由 expo-audio 的 useAudioRecorder 持有并自动释放，
 * 权限申请、音频模式、文件持久化统一交给 voice.service。
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(
    useMemo(() => ({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' as const }), [])
  );
  const recorderState = useAudioRecorderState(recorder);
  const { isRecording, durationMillis } = recorderState as RecorderState;

  // 保存/放弃期间的本地瞬态
  const [isSaving, setSaving] = useState(false);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const voice = await loadVoiceService();
      const granted = await voice.requestRecordingPermission();
      if (!granted) {
        return false;
      }
      await voice.configureAudioSession();
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch (e) {
      console.warn('voice start failed:', (e as Error)?.message);
      return false;
    }
  }, [recorder]);

  const stop = useCallback(
    async (noteId: string): Promise<SaveResult | null> => {
      setSaving(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          return null;
        }
        const voice = await loadVoiceService();
        const durationMs = recorder.getStatus().durationMillis ?? 0;
        const saved = await voice.saveVoiceRecording(uri, noteId, durationMs);
        return saved ? { recordId: saved.recordId } : null;
      } catch (e) {
        console.warn('voice stop failed:', (e as Error)?.message);
        return null;
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recorder]
  );

  const cancel = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      // 静默忽略：放弃录音时无需处理异常
    }
  }, [recorder]);

  return {
    isRecording,
    isSaving,
    duration: Math.round(durationMillis / 1000),
    start,
    stop,
    cancel,
  };
}
