// ============================================
// 屏幕截屏服务封装
// 调用本地原生模块 ScreenCapture（MediaProjection 抓一帧），
// 将截图持久化为图片，并归档为「图片笔记」。
// ============================================

import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { persistAttachmentFile } from '../src/utils/attachmentStorage';
import { NoteService } from './note.service';
import { AttachmentService } from './attachment.service';

// 本地原生模块（modules/screen-capture）
// 通过相对路径导入，避免将其作为独立 npm 包。
import { captureScreenAsync } from '../modules/screen-capture';

export interface ScreenCaptureNoteResult {
  noteId: string;
  filePath: string;
}

/**
 * 触发全局截屏，单帧。
 * 返回截图文件的本地路径（file://）。
 */
export async function captureScreen(): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('屏幕截屏仅在 Android 端可用');
  }
  const { filePath } = await captureScreenAsync();
  return filePath;
}

/**
 * 截屏并归档为「图片笔记」。
 * 先截屏 → 持久化到附件目录 → 创建笔记并挂附件。
 */
export async function captureToImageNote(title?: string): Promise<ScreenCaptureNoteResult> {
  const rawPath = await captureScreen();

  // 1. 持久化截图到应用附件目录
  const filePath = await persistAttachmentFile(rawPath, 'image/png', `screenshot_${Date.now()}.png`);

  // 2. 创建一篇图片笔记。
  // 截屏可能包含其它应用内容（银行/账号等敏感画面），默认标记为敏感，
  // 使其不被导出、不进入 AI（遵守隐私承诺）。
  const note = await NoteService.createNote({
    title: title || `截图 ${new Date().toLocaleString()}`,
    content: '',
    is_sensitive: 1,
  });

  // 读取实际文件大小（供附件元数据）
  let fileSize = 0;
  try {
    fileSize = new File(filePath).size ?? 0;
  } catch {
    fileSize = 0;
  }

  // 3. 挂载附件（做补偿：DB 失败则删文件）
  try {
    await AttachmentService.createAttachment({
      note_id: note.id,
      type: 'image',
      file_name: `screenshot_${Date.now()}.png`,
      file_path: filePath,
      file_size: fileSize,
      mime_type: 'image/png',
      title: title || '截图',
    });
  } catch (e) {
    await purgeFile(filePath).catch(() => {});
    throw e;
  }

  return { noteId: note.id, filePath };
}

async function purgeFile(path: string): Promise<void> {
  // 复用 attachmentStorage 的清理逻辑
  const { purgeFiles } = await import('../src/utils/attachmentStorage');
  await purgeFiles([path]);
}
