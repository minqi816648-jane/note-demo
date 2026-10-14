import type { PickedImageAsset } from './image';
import {
  persistImageAttachment,
  persistFileAttachment,
  purgeAttachment,
  purgeAttachmentsByNote,
  getNoteAttachments,
  purgeFiles,
} from './attachmentStorage';
import type { Attachment } from '../constants/theme';

/**
 * 保存一张图片到笔记：
 * 1. 持久化图片文件到应用文档目录
 * 2. 若提供 noteId，立即创建 attachments 记录
 *
 * @returns 持久化的文件路径（file://），用于插入编辑器 <img src="..."/>
 */
export async function saveNoteImage(
  image: PickedImageAsset,
  noteId?: string | null
): Promise<string> {
  const attachment = await persistImageAttachment({
    sourceUri: image.uri,
    mimeType: image.mimeType,
    fileName: image.fileName,
    noteId: noteId ?? '',
    width: image.width,
    height: image.height,
  });

  // 持久化的 file:// 路径，用于插入编辑器 <img src="..."/>
  return attachment.file_path;
}

/**
 * 同步笔记的附件记录与 HTML 内容一致：
 * 1. HTML 中已移除的图片，清理其 attachments 记录和磁盘文件。
 * 2. HTML 中出现但缺少记录的图片路径，补录记录。
 */
export async function syncNoteAttachments(html: string, noteId: string): Promise<void> {
  const inHtml = extractLocalImagePaths(html);
  const existing = await getNoteAttachments(noteId);

  // 移除 HTML 中已不存在的图片附件（记录 + 文件）
  // 注意：仅清理图片附件（type === 'image'）。文件/音频/视频附件的 file://
  // 路径不会出现在编辑器 HTML 的 <img src> 中，切勿当作孤立图片误删。
  for (const attachment of existing) {
    if (attachment.type !== 'image') continue;
    if (!isLocalImagePath(attachment.file_path)) continue;
    if (!inHtml.includes(attachment.file_path)) {
      await purgeAttachment(attachment);
    }
  }

  // 补录 HTML 中存在但尚无记录的图片路径
  const knownPaths = new Set(existing.map((a) => a.file_path));
  for (const filePath of inHtml) {
    if (!knownPaths.has(filePath)) {
      await persistImageAttachment({
        sourceUri: filePath,
        mimeType: guessMime(filePath),
        fileName: filePath.split('/').pop() || filePath,
        noteId,
        width: 0,
        height: 0,
      });
    }
  }
}

/**
 * 从编辑器 HTML 中提取本地图片的 file:// 路径
 */
export function extractLocalImagePaths(html: string): string[] {
  if (!html) return [];
  // 兼容单引号和双引号的 src 属性
  const regex = /src=(["'])(file:\/\/[^"']+)\1/gi;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[2]);
  }
  return matches;
}

/**
 * 删除笔记时清理其附件（DB 记录 + 磁盘文件）
 */
export async function clearNoteAttachments(noteId: string): Promise<void> {
  await purgeAttachmentsByNote(noteId);
}

/**
 * 清理尚未保存/取消编辑时产生的孤立图片文件
 */
export async function purgeInsertedFiles(paths: string[]): Promise<void> {
  await purgeFiles(paths);
}

/**
 * 根据文件路径猜测 mime 类型
 */
function guessMime(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * 判断是否为本地 file:// 图片路径
 */
function isLocalImagePath(filePath: string): boolean {
  return typeof filePath === 'string' && filePath.startsWith('file://');
}

export { getNoteAttachments };
export { persistFileAttachment };
export type { Attachment };
