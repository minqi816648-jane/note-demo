import { File, Directory, Paths } from 'expo-file-system';
import { AttachmentService } from '../../services/attachment.service';
import type { Attachment, AttachmentType } from '../constants/theme';
import { generateUUID } from './uuid';

// 附件存储根目录（应用文档目录下的 attachments 子目录）
const ATTACHMENTS_DIR = new Directory(Paths.document, 'attachments');

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'audio/mpeg': 'mp3',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'video/mp4': 'mp4',
  // 文档类
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/rtf': 'rtf',
  'application/zip': 'zip',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

/**
 * 确保附件目录存在
 */
function ensureAttachmentsDir(): Directory {
  if (!ATTACHMENTS_DIR.exists) {
    ATTACHMENTS_DIR.create({ intermediates: true });
  }
  return ATTACHMENTS_DIR;
}

/**
 * 将外部 uri（相册/相机等）持久化到应用的附件目录。
 * 返回持久化的新文件路径（file://）。
 */
export async function persistAttachmentFile(
  sourceUri: string,
  mimeType: string,
  sourceName?: string
): Promise<string> {
  const dir = ensureAttachmentsDir();
  const ext =
    convertName(sourceName) ||
    MIME_EXTENSION[mimeType] ||
    convertExt(sourceUri) ||
    'bin';
  const fileName = `${generateUUID()}.${ext}`;
  const dest = new File(dir, fileName);
  await new File(sourceUri).copy(dest, { overwrite: true });
  return dest.uri;
}

/**
 * 从原始文件名推断扩展名（最可靠，覆盖 .pdf 等文档）。
 */
function convertName(name?: string | null): string | null {
  if (!name) return null;
  const match = /\.([a-zA-Z0-9]{2,5})$/.exec(name.trim());
  return match ? match[1].toLowerCase() : null;
}

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  rtf: 'application/rtf',
  zip: 'application/zip',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * 从文件名推断 MIME 类型；无法推断时返回 fallback。
 */
function mimeFromName(name: string | undefined | null, fallback: string): string {
  const ext = convertName(name);
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext];
  return fallback;
}

/**
 * 根据源 uri 推断扩展名
 */
function convertExt(uri: string): string | null {
  const match = /\.[a-zA-Z0-9]{2,5}$/.exec(uri);
  return match ? match[0].replace('.', '') : null;
}

/**
 * 持久化图片并创建附件记录。
 * 当 noteId 为空时仅持久化文件，不创建 DB 记录（用于新建笔记尚未得到 noteId 的场景）。
 */
export async function persistImageAttachment(params: {
  sourceUri: string;
  mimeType: string;
  fileName: string;
  noteId?: string | null;
  width: number;
  height: number;
}): Promise<Attachment> {
  const filePath = await persistAttachmentFile(params.sourceUri, params.mimeType);
  const file = new File(filePath);

  if (!params.noteId) {
    return {
      id: '',
      note_id: '',
      type: 'image',
      file_name: params.fileName,
      file_path: filePath,
      file_size: file.size,
      mime_type: params.mimeType,
      duration: null,
      width: params.width || null,
      height: params.height || null,
      thumbnail_path: null,
      ocr_text: null,
      ai_description: null,
      title: params.fileName,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    };
  }

  try {
    return await AttachmentService.createAttachment({
      note_id: params.noteId,
      type: 'image',
      file_name: params.fileName,
      file_path: filePath,
      file_size: file.size,
      mime_type: params.mimeType,
      width: params.width || null,
      height: params.height || null,
      title: params.fileName,
    });
  } catch (error) {
    // 补偿：DB 记录写入失败则删除已持久化的文件，避免孤儿文件
    await purgeFiles([filePath]).catch(() => {});
    throw error;
  }
}

/**
 * 获取笔记的所有附件
 */
export async function getNoteAttachments(noteId: string): Promise<Attachment[]> {
  return AttachmentService.getAttachmentsByNoteId(noteId);
}

/**
 * 清理附件记录及其磁盘文件（硬删除）
 */
export async function purgeAttachmentsByNote(noteId: string): Promise<void> {
  const attachments = await AttachmentService.getAttachmentsByNoteId(noteId);
  for (const attachment of attachments) {
    await purgeAttachment(attachment);
  }
}

/**
 * 清理单个附件（删记录 + 删文件）
 */
export async function purgeAttachment(attachment: Attachment): Promise<void> {
  try {
    const file = new File(attachment.file_path);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // 文件可能已被删除，忽略
  }
  await AttachmentService.hardDeleteAttachment(attachment.id);
}

/**
 * 批量删除指定的磁盘文件（不涉及 DB 记录）
 * 用于清理已插入编辑器但被取消编辑的孤立图片文件。
 */
export async function purgeFiles(paths: string[]): Promise<void> {
  for (const filePath of paths) {
    if (!filePath) continue;
    try {
      const file = new File(filePath);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // 忽略单个文件的删除失败
    }
  }
}

/**
 * 判断是否为受支持的附件类型
 */
export function isAttachmentType(type: string): boolean {
  const allowed: AttachmentType[] = ['image', 'audio', 'video', 'file'];
  return allowed.includes(type as AttachmentType);
}

/**
 * 持久化一个文档类文件（PDF/Word/txt 等）并创建附件记录。
 * noteId 为空时仅持久化文件、不创建 DB 记录（返回 id/note_id 为空的 Attachment）。
 */
export async function persistFileAttachment(params: {
  sourceUri: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  noteId?: string | null;
  title?: string | null;
}): Promise<Attachment> {
  // 修正 MIME：外部选择器返回的 type 常缺省，按文件名扩展名推断（避免存成 octet-stream/.bin）
  const mimeType = mimeFromName(params.fileName, params.mimeType || 'application/octet-stream');
  const filePath = await persistAttachmentFile(params.sourceUri, mimeType, params.fileName);

  if (!params.noteId) {
    return {
      id: '',
      note_id: '',
      type: 'file',
      file_name: params.fileName,
      file_path: filePath,
      file_size: params.fileSize,
      mime_type: mimeType,
      duration: null,
      width: null,
      height: null,
      thumbnail_path: null,
      ocr_text: null,
      ai_description: null,
      title: params.title || params.fileName,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    };
  }

  try {
    return await AttachmentService.createAttachment({
      note_id: params.noteId,
      type: 'file',
      file_name: params.fileName,
      file_path: filePath,
      file_size: params.fileSize,
      mime_type: mimeType,
      title: params.title || params.fileName,
    });
  } catch (error) {
    // 补偿：DB 记录写入失败则删除已持久化的文件，避免孤儿文件
    await purgeFiles([filePath]).catch(() => {});
    throw error;
  }
}
