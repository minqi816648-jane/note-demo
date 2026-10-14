// ============================================
// 语音录音服务
// 基于 expo-audio：调用端持有 useAudioRecorder，本模块负责
// 权限申请 + 音频模式 + 将录音文件持久化为附件 + 建 voice_records 记录
// ============================================

import { setAudioModeAsync, requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';
import { VoiceRecordService } from './voiceRecord.service';
import { AttachmentService } from './attachment.service';
import { persistAttachmentFile } from '../src/utils/attachmentStorage';
import type { Attachment } from '../src/constants/theme';

/**
 * 检查录音权限（不弹窗）
 */
export async function checkRecordingPermission(): Promise<boolean> {
  try {
    const { status } = await getRecordingPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * 申请录音权限（弹系统授权框）
 */
export async function requestRecordingPermission(): Promise<boolean> {
  try {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * 配置音频会话（录音前必须调用）
 */
export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
}

/**
 * 停止录音持久化为音频附件，创建 voice_records 记录
 * @param uri 录音文件地址（来自 expo-audio useAudioRecorder().uri）
 * @param noteId 关联笔记
 * @param onTranscribed 转写回调（预留，ASR 需讯飞等服务）
 */
export async function saveVoiceRecording(
  uri: string,
  noteId: string,
  durationMillis: number,
  onTranscribed?: (transcript: string) => void
): Promise<{ recordId: string; attachment?: Attachment }> {
  const duration = Math.round(durationMillis);

  // 持久化音频文件到附件目录（本地）
  const filePath = await persistAttachmentFile(uri, 'audio/mpeg');

  try {
    // 创建附件记录
    const attachment = await AttachmentService.createAttachment({
      note_id: noteId,
      type: 'audio',
      file_name: `voice_${Date.now()}.mp3`,
      file_path: filePath,
      file_size: 0,
      mime_type: 'audio/mpeg',
      duration: duration || null,
      title: '语音笔记',
    });

    // 创建语音记录（转写状态：processing）
    const record = await VoiceRecordService.createRecord({
      note_id: noteId,
      attachment_id: attachment.id,
      duration: duration || 0,
      transcript_status: 'processing',
    });

    // 此处转写需要讯飞等 ASR 服务（见 voiceStore 的转写钩子）。
    onTranscribed?.('');

    return { recordId: record.id, attachment };
  } catch (error) {
    // 补偿：后续写入失败则清理已持久化的文件，避免孤儿音频
    try {
      const { File } = await import('expo-file-system');
      const f = new File(filePath);
      if (f.exists) f.delete();
    } catch {
      // 忽略清理失败
    }
    throw error;
  }
}
