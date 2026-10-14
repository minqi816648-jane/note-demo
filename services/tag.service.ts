import { getDB } from './db/database';
import type { Tag, NoteTag } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';
import { syncFtsForNote } from './search.service';

/**
 * 标签服务层
 * 提供 Tags 表的 CRUD 操作及笔记-标签关联管理
 */
export class TagService {
  /**
   * 创建标签
   */
  static async createTag(name: string, color?: string): Promise<Tag> {
    const db = await getDB();
    const id = generateUUID();
    const now = nowISO();

    const tag: Tag = {
      id,
      name,
      color: color ?? null,
      usage_count: 0,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      'INSERT INTO tags (id, name, color, usage_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [tag.id, tag.name, tag.color, 0, tag.created_at, tag.updated_at]
    );

    return tag;
  }

  /**
   * 更新标签
   */
  static async updateTag(id: string, data: Partial<Tag>): Promise<void> {
    const db = await getDB();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await db.runAsync(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 删除标签（同时删除关联关系）
   */
  static async deleteTag(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM note_tags WHERE tag_id = ?', [id]);
    await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
  }

  /**
   * 获取所有标签（按使用次数排序）
   */
  static async getAllTags(): Promise<Tag[]> {
    const db = await getDB();
    return await db.getAllAsync<Tag>(
      'SELECT * FROM tags ORDER BY usage_count DESC, name ASC'
    );
  }

  /**
   * 按 ID 获取标签
   */
  static async getTagById(id: string): Promise<Tag | null> {
    const db = await getDB();
    const tag = await db.getFirstAsync<Tag>('SELECT * FROM tags WHERE id = ?', [id]);
    return tag ?? null;
  }

  /**
   * 按名称查找标签
   */
  static async getTagByName(name: string): Promise<Tag | null> {
    const db = await getDB();
    const tag = await db.getFirstAsync<Tag>('SELECT * FROM tags WHERE name = ?', [name]);
    return tag ?? null;
  }

  /**
   * 获取笔记的所有标签
   */
  static async getTagsByNoteId(noteId: string): Promise<Tag[]> {
    const db = await getDB();
    return await db.getAllAsync<Tag>(
      `SELECT t.* FROM tags t
       INNER JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ?
       ORDER BY t.name ASC`,
      [noteId]
    );
  }

  /**
   * 移除笔记与标签的关联（不刷新 FTS，供批量场景用）。
   */
  private static async removeTagLink(noteId: string, tagId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
      [noteId, tagId]
    );
    await db.runAsync(
      'UPDATE tags SET usage_count = MAX(0, usage_count - 1), updated_at = ? WHERE id = ?',
      [nowISO(), tagId]
    );
  }

  /**
   * 给笔记添加标签（如果标签不存在则创建），不刷新 FTS。
   */
  private static async addTagLink(noteId: string, tagName: string, color?: string): Promise<Tag> {
    const db = await getDB();

    let tag = await TagService.getTagByName(tagName);
    if (!tag) {
      tag = await TagService.createTag(tagName, color);
    }

    const existing = await db.getFirstAsync<NoteTag>(
      'SELECT * FROM note_tags WHERE note_id = ? AND tag_id = ?',
      [noteId, tag.id]
    );

    if (!existing) {
      const now = nowISO();
      await db.runAsync(
        'INSERT INTO note_tags (id, note_id, tag_id, created_at) VALUES (?, ?, ?, ?)',
        [generateUUID(), noteId, tag.id, now]
      );
      await db.runAsync(
        'UPDATE tags SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?',
        [now, tag.id]
      );
    }

    return tag;
  }

  /**
   * 给笔记添加标签（如果标签不存在则创建）
   */
  static async addTagToNote(noteId: string, tagName: string, color?: string): Promise<Tag> {
    const tag = await TagService.addTagLink(noteId, tagName, color);
    await syncFtsForNote(noteId);
    return tag;
  }

  /**
   * 从笔记移除标签
   */
  static async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await TagService.removeTagLink(noteId, tagId);
    await syncFtsForNote(noteId);
  }

  /**
   * 批量设置笔记标签（替换原有标签，FTS 由调用方统一刷新一次）
   */
  static async setNoteTags(noteId: string, tagNames: string[]): Promise<Tag[]> {
    const currentTags = await TagService.getTagsByNoteId(noteId);

    for (const tag of currentTags) {
      await TagService.removeTagLink(noteId, tag.id);
    }

    const result: Tag[] = [];
    for (const name of tagNames) {
      const tag = await TagService.addTagLink(noteId, name);
      result.push(tag);
    }

    return result;
  }

  /**
   * 获取使用最多的标签（Top N）
   */
  static async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const db = await getDB();
    return await db.getAllAsync<Tag>(
      'SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?',
      [limit]
    );
  }
}
