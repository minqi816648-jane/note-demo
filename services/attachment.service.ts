import { getDB } from './db/database';
import type { Attachment } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';

/**
 * 附件服务层
 * 提供 Attachments 表的 CRUD 操作
 */
export class AttachmentService {
  /**
   * 创建附件记录
   */
  static async createAttachment(data: Partial<Attachment>): Promise<Attachment> {
    const db = await getDB();
    const id = data.id || generateUUID();
    const now = nowISO();

    const attachment: Attachment = {
      id,
      note_id: data.note_id ?? '',
      type: data.type ?? 'file',
      file_name: data.file_name ?? '',
      file_path: data.file_path ?? '',
      file_size: data.file_size ?? 0,
      mime_type: data.mime_type ?? null,
      duration: data.duration ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      thumbnail_path: data.thumbnail_path ?? null,
      ocr_text: data.ocr_text ?? null,
      ai_description: data.ai_description ?? null,
      title: data.title ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await db.runAsync(
      `INSERT INTO attachments (
        id, note_id, type, file_name, file_path, file_size, mime_type,
        duration, width, height, thumbnail_path, ocr_text, ai_description,
        title, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachment.id, attachment.note_id, attachment.type, attachment.file_name,
        attachment.file_path, attachment.file_size, attachment.mime_type,
        attachment.duration, attachment.width, attachment.height,
        attachment.thumbnail_path, attachment.ocr_text, attachment.ai_description,
        attachment.title, attachment.created_at, attachment.updated_at, null,
      ]
    );

    return attachment;
  }

  /**
   * 更新附件
   */
  static async updateAttachment(id: string, data: Partial<Attachment>): Promise<void> {
    const db = await getDB();
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields: (keyof Attachment)[] = [
      'note_id', 'type', 'file_name', 'file_path', 'file_size', 'mime_type',
      'duration', 'width', 'height', 'thumbnail_path', 'ocr_text',
      'ai_description', 'title', 'deleted_at',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field as keyof Attachment]);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await db.runAsync(
      `UPDATE attachments SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 软删除附件
   */
  static async softDeleteAttachment(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowISO(), nowISO(), id]
    );
  }

  /**
   * 物理删除附件
   */
  static async hardDeleteAttachment(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
  }

  /**
   * 获取笔记的所有附件
   */
  static async getAttachmentsByNoteId(noteId: string): Promise<Attachment[]> {
    const db = await getDB();
    return await db.getAllAsync<Attachment>(
      'SELECT * FROM attachments WHERE note_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
      [noteId]
    );
  }

  /**
   * 批量获取多篇笔记的附件类型索引（供列表展示多模态，避免 N+1）
   * 返回 Map<noteId, { hasImage, hasVoice, hasDocument }>
   */
  static async getAttachmentsTypeIndex(
    noteIds: string[]
  ): Promise<Map<string, { hasImage: boolean; hasVoice: boolean; hasDocument: boolean }>> {
    const index = new Map<string, { hasImage: boolean; hasVoice: boolean; hasDocument: boolean }>();
    if (!noteIds.length) return index;
    const db = await getDB();
    try {
      const placeholders = noteIds.map(() => '?').join(',');
      const rows = await db.getAllAsync<{ note_id: string; type: string }>(
        `SELECT note_id, type FROM attachments
         WHERE note_id IN (${placeholders}) AND deleted_at IS NULL`,
        noteIds
      );
      for (const row of rows) {
        const cur = index.get(row.note_id) || { hasImage: false, hasVoice: false, hasDocument: false };
        if (row.type === 'image') {
          cur.hasImage = true;
        }
        if (row.type === 'audio' || row.type === 'voice') {
          cur.hasVoice = true;
        }
        if (row.type === 'file') {
          cur.hasDocument = true;
        }
        index.set(row.note_id, cur);
      }
    } catch (e) {
      // 失败时返回空索引，列表回退纯文本卡
      console.warn('getAttachmentsTypeIndex failed:', (e as Error)?.message);
    }
    return index;
  }

  /**
   * 按类型获取附件
   */
  static async getAttachmentsByType(type: string): Promise<Attachment[]> {
    const db = await getDB();
    return await db.getAllAsync<Attachment>(
      'SELECT * FROM attachments WHERE type = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [type]
    );
  }

  /**
   * 按 ID 获取附件
   */
  static async getAttachmentById(id: string): Promise<Attachment | null> {
    const db = await getDB();
    const attachment = await db.getFirstAsync<Attachment>(
      'SELECT * FROM attachments WHERE id = ?',
      [id]
    );
    return attachment ?? null;
  }

  /**
   * 更新 OCR 识别结果
   */
  static async updateOCRText(id: string, ocrText: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE attachments SET ocr_text = ?, updated_at = ? WHERE id = ?',
      [ocrText, nowISO(), id]
    );
  }

  /**
   * 更新 AI 描述
   */
  static async updateAIDescription(id: string, description: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE attachments SET ai_description = ?, updated_at = ? WHERE id = ?',
      [description, nowISO(), id]
    );
  }

  /**
   * 获取笔记的附件统计
   */
  static async getAttachmentStats(noteId: string): Promise<{
    total: number;
    images: number;
    audio: number;
    video: number;
    files: number;
    totalSize: number;
  }> {
    const db = await getDB();
    const result = await db.getFirstAsync<{
      total: number;
      images: number;
      audio: number;
      video: number;
      files: number;
      totalSize: number;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as images,
        SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) as audio,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as video,
        SUM(CASE WHEN type = 'file' THEN 1 ELSE 0 END) as files,
        SUM(file_size) as totalSize
      FROM attachments
      WHERE note_id = ? AND deleted_at IS NULL`,
      [noteId]
    );

    return {
      total: result?.total ?? 0,
      images: result?.images ?? 0,
      audio: result?.audio ?? 0,
      video: result?.video ?? 0,
      files: result?.files ?? 0,
      totalSize: result?.totalSize ?? 0,
    };
  }
}
