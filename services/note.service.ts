import { getDB } from './db/database';
import type { Note, NoteFilter } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';
import { htmlToText } from '../src/utils/html';
import { syncFtsForNote, likePattern } from './search.service';

/**
 * 笔记服务层
 * 提供 Notes 表的完整 CRUD 操作及高级查询
 */
export class NoteService {
  /**
   * 创建笔记
   */
  static async createNote(data: Partial<Note>): Promise<Note> {
    const db = await getDB();
    const id = data.id || generateUUID();
    const now = nowISO();

    const note: Note = {
      id,
      parent_id: data.parent_id ?? null,
      title: data.title ?? '',
      content: data.content ?? '',
      content_text: data.content_text ?? (data.content ? htmlToText(data.content) : ''),
      category_id: data.category_id ?? null,
      ai_summary: data.ai_summary ?? null,
      ai_tags: data.ai_tags ?? null,
      is_sensitive: data.is_sensitive ?? 0,
      is_favorite: data.is_favorite ?? 0,
      ai_classify_confirmed: data.ai_classify_confirmed ?? 1,
      content_hash: data.content_hash ?? null,
      device_id: data.device_id ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await db.runAsync(
      `INSERT INTO notes (
        id, parent_id, title, content, content_text, category_id,
        ai_summary, ai_tags, is_sensitive, is_favorite,
        ai_classify_confirmed, content_hash, device_id, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id, note.parent_id, note.title, note.content, note.content_text, note.category_id,
        note.ai_summary, note.ai_tags, note.is_sensitive, note.is_favorite,
        note.ai_classify_confirmed, note.content_hash, note.device_id, note.created_at, note.updated_at, note.deleted_at,
      ]
    );

    // 维护 FTS 索引（无 INSERT 触发器兜底，必须在创建后同步）
    await syncFtsForNote(note.id);

    return note;
  }

  /**
   * 更新笔记
   */
  static async updateNote(id: string, data: Partial<Note>): Promise<void> {
    const db = await getDB();
    const now = nowISO();
    const fields: string[] = [];
    const values: any[] = [];

    // 动态构建 SET 子句
    const allowedFields: (keyof Note)[] = [
      'parent_id', 'title', 'content', 'content_text', 'category_id',
      'ai_summary', 'ai_tags', 'is_sensitive', 'is_favorite',
      'ai_classify_confirmed', 'content_hash', 'device_id', 'deleted_at',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field as keyof Note] ?? null);
      }
    }

    // 一致性保证：更新 content（HTML）时，若未显式传 content_text，则自动由 HTML 派生，
    // 避免全文搜索 / 摘要使用的纯文本落后于富文本内容。
    if (data.content !== undefined && !('content_text' in data)) {
      fields.push('content_text = ?');
      values.push(htmlToText(data.content));
    }

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);

    await db.runAsync(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 软删除笔记
   */
  static async softDeleteNote(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowISO(), nowISO(), id]
    );
  }

  /**
   * 恢复软删除的笔记
   */
  static async restoreNote(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [nowISO(), id]
    );
  }

  /**
   * 物理删除笔记（彻底删除）
   */
  static async hardDeleteNote(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  }

  /**
   * 按 ID 获取笔记
   */
  static async getNoteById(id: string): Promise<Note | null> {
    const db = await getDB();
    const note = await db.getFirstAsync<Note>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    return note ?? null;
  }

  /**
   * 获取笔记列表（支持筛选和排序）
   */
  static async getNotes(filter: NoteFilter = {}): Promise<Note[]> {
    const db = await getDB();
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];

    // 文件夹筛选
    if (filter.folderId !== undefined) {
      if (filter.folderId === null) {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push('parent_id = ?');
        values.push(filter.folderId);
      }
    }

    // 分类筛选
    if (filter.categoryId) {
      conditions.push('category_id = ?');
      values.push(filter.categoryId);
    }

    // 标签筛选（通过 JOIN）
    if (filter.tagId) {
      conditions.push('id IN (SELECT note_id FROM note_tags WHERE tag_id = ?)');
      values.push(filter.tagId);
    }

    // 搜索
    if (filter.searchText) {
      conditions.push("(title LIKE ? ESCAPE '\\' OR content_text LIKE ? ESCAPE '\\')");
      const searchPattern = likePattern(filter.searchText);
      values.push(searchPattern, searchPattern);
    }

    // 收藏
    if (filter.isFavorite !== undefined) {
      conditions.push('is_favorite = ?');
      values.push(filter.isFavorite ? 1 : 0);
    }

    // 排序
    const sortBy = filter.sortBy || 'updated_at';
    const sortOrder = filter.sortOrder || 'DESC';
    const sortColumn = ['created_at', 'updated_at', 'title'].includes(sortBy) ? sortBy : 'updated_at';
    // 白名单化排序方向，防止任意值进入 SQL 排序子句
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT * FROM notes
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${safeOrder}
    `;

    return await db.getAllAsync<Note>(sql, values);
  }

  /**
   * 获取回收站中的笔记
   */
  static async getDeletedNotes(): Promise<Note[]> {
    const db = await getDB();
    return await db.getAllAsync<Note>(
      'SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
  }

  /**
   * 切换收藏状态
   */
  static async toggleFavorite(id: string): Promise<void> {
    const db = await getDB();
    const note = await NoteService.getNoteById(id);
    if (!note) return;

    await db.runAsync(
      'UPDATE notes SET is_favorite = ?, updated_at = ? WHERE id = ?',
      [note.is_favorite === 1 ? 0 : 1, nowISO(), id]
    );
  }

  /**
   * 移动笔记到文件夹
   */
  static async moveNote(id: string, folderId: string | null): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE notes SET parent_id = ?, updated_at = ? WHERE id = ?',
      [folderId, nowISO(), id]
    );
  }

  /**
   * 更新 AI 分类和标签
   */
  static async updateAIClassification(
    id: string,
    categoryId: string | null,
    aiTags: string[]
  ): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE notes SET category_id = ?, ai_tags = ?, updated_at = ? WHERE id = ?',
      [categoryId, JSON.stringify(aiTags), nowISO(), id]
    );
  }

  /**
   * 标记 AI 分类为已确认（或重新置为待确认）
   */
  static async setClassifyConfirmed(id: string, confirmed: number): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE notes SET ai_classify_confirmed = ?, updated_at = ? WHERE id = ?',
      [confirmed ? 1 : 0, nowISO(), id]
    );
  }

  /**
   * 确认 AI 分类结果（应用确认的分类/标签并标记已确认）
   */
  static async confirmClassification(
    id: string,
    categoryId: string | null,
    aiTags: string[]
  ): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE notes
       SET category_id = ?, ai_tags = ?, ai_classify_confirmed = 1, updated_at = ?
       WHERE id = ?`,
      [categoryId, JSON.stringify(aiTags), nowISO(), id]
    );
  }

  /**
   * 获取「AI 已分类但待确认」的笔记列表
   */
  static async getPendingClassificationNotes(): Promise<Note[]> {
    const db = await getDB();
    return await db.getAllAsync<Note>(
      `SELECT * FROM notes
       WHERE deleted_at IS NULL
         AND ai_classify_confirmed = 0
       ORDER BY updated_at DESC`
    );
  }

  /**
   * 获取待确认分类的笔记数量
   */
  static async getPendingClassificationCount(): Promise<number> {
    const db = await getDB();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM notes
       WHERE deleted_at IS NULL AND ai_classify_confirmed = 0`
    );
    return result?.count ?? 0;
  }

  /**
   * 获取笔记数量统计
   */
  static async getNotesCount(folderId?: string | null): Promise<number> {
    const db = await getDB();
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];

    if (folderId !== undefined) {
      if (folderId === null) {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push('parent_id = ?');
        values.push(folderId);
      }
    }

    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM notes WHERE ${conditions.join(' AND ')}`,
      values
    );
    return result?.count ?? 0;
  }
}
