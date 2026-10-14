// ============================================
// 保存链接服务
// 管理 saved_links 表：保存 / 查询 / 移除
// ============================================

import { getDB } from './db/database';
import type { SavedLink, LinkTag, SavedLinkTag } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';

export class SavedLinkService {
  /** 保存一个链接（url 相同则更新已存在记录） */
  static async saveLink(data: Partial<SavedLink>): Promise<SavedLink> {
    const db = await getDB();
    const url = data.url?.trim();
    if (!url) throw new Error('链接 URL 不能为空');

    // 查重（同 url 且未删除）
    const existing = await db.getFirstAsync<SavedLink>(
      `SELECT * FROM saved_links WHERE url = ? AND deleted_at IS NULL`,
      [url]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE saved_links
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             note_id = COALESCE(?, note_id),
             updated_at = ?
         WHERE id = ?`,
        [
          data.title ?? null,
          data.description ?? null,
          data.note_id ?? existing.note_id,
          nowISO(),
          existing.id,
        ]
      );
      return (await db.getFirstAsync<SavedLink>('SELECT * FROM saved_links WHERE id = ?', [existing.id]))!;
    }

    const now = nowISO();
    const link: SavedLink = {
      id: data.id || generateUUID(),
      note_id: data.note_id ?? null,
      url,
      title: data.title ?? url,
      description: data.description ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      favicon_url: data.favicon_url ?? null,
      // category 已由标签机制取代，不再写入（保留列以兼容旧数据读取）
      category: null,
      content_text: data.content_text ?? null,
      read_status: data.read_status ?? 0,
      is_favorite: data.is_favorite ?? 0,
      is_sensitive: data.is_sensitive ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await db.runAsync(
      `INSERT INTO saved_links (
        id, note_id, url, title, description, thumbnail_url, favicon_url,
        category, content_text, read_status, is_favorite, is_sensitive,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        link.id, link.note_id, link.url, link.title, link.description,
        link.thumbnail_url, link.favicon_url, link.category, link.content_text,
        link.read_status, link.is_favorite, link.is_sensitive,
        link.created_at, link.updated_at, null,
      ]
    );

    return link;
  }

  /** 获取所有保存的链接（未删除） */
  static async getAllLinks(): Promise<SavedLink[]> {
    const db = await getDB();
    return await db.getAllAsync<SavedLink>(
      `SELECT * FROM saved_links
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC`
    );
  }

  /** 按 url 查找是否已保存 */
  static async getSavedByUrl(url: string): Promise<SavedLink | null> {
    const db = await getDB();
    const link = await db.getFirstAsync<SavedLink>(
      `SELECT * FROM saved_links WHERE url = ? AND deleted_at IS NULL`,
      [url]
    );
    return link ?? null;
  }

  /** 软删除链接 */
  static async removeLink(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE saved_links SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [nowISO(), nowISO(), id]
    );
  }

  /** 切换收藏 */
  static async toggleFavorite(id: string): Promise<void> {
    const db = await getDB();
    const link = await db.getFirstAsync<SavedLink>('SELECT * FROM saved_links WHERE id = ?', [id]);
    if (!link) return;
    await db.runAsync(
      'UPDATE saved_links SET is_favorite = ?, updated_at = ? WHERE id = ?',
      [link.is_favorite === 1 ? 0 : 1, nowISO(), id]
    );
  }

  /** 标记已读 */
  static async markRead(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE saved_links SET read_status = 1, updated_at = ? WHERE id = ?',
      [nowISO(), id]
    );
  }

  /** 设置已读/未读 */
  static async setReadStatus(id: string, status: number): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE saved_links SET read_status = ?, updated_at = ? WHERE id = ?',
      [status ? 1 : 0, nowISO(), id]
    );
  }

  // ---- 链接标签（独立注册表，机制同笔记标签）----

  /** 获取所有链接标签（按使用次数排序） */
  static async getAllLinkTags(): Promise<LinkTag[]> {
    const db = await getDB();
    return await db.getAllAsync<LinkTag>(
      'SELECT * FROM link_tags ORDER BY usage_count DESC, name ASC'
    );
  }

  /** 获取一个链接的所有标签 */
  static async getTagsByLinkId(linkId: string): Promise<LinkTag[]> {
    const db = await getDB();
    return await db.getAllAsync<LinkTag>(
      `SELECT t.* FROM link_tags t
       INNER JOIN saved_link_tags st ON t.id = st.tag_id
       WHERE st.link_id = ?
       ORDER BY t.name ASC`,
      [linkId]
    );
  }

  /** 按名称查找链接标签 */
  static async getLinkTagByName(name: string): Promise<LinkTag | null> {
    const db = await getDB();
    const tag = await db.getFirstAsync<LinkTag>('SELECT * FROM link_tags WHERE name = ?', [name]);
    return tag ?? null;
  }

  /** 给链接添加标签（不存在则创建），可多标签 */
  static async addTagToLink(linkId: string, tagName: string, color?: string): Promise<LinkTag> {
    const db = await getDB();
    const trimmed = tagName.trim();
    if (!trimmed) throw new Error('标签名不能为空');

    let tag = await SavedLinkService.getLinkTagByName(trimmed);
    if (!tag) {
      tag = {
        id: generateUUID(),
        name: trimmed,
        color: color ?? null,
        usage_count: 0,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      await db.runAsync(
        'INSERT INTO link_tags (id, name, color, usage_count, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
        [tag.id, tag.name, tag.color, tag.created_at, tag.updated_at]
      );
    }

    const existing = await db.getFirstAsync<SavedLinkTag>(
      'SELECT * FROM saved_link_tags WHERE link_id = ? AND tag_id = ?',
      [linkId, tag.id]
    );
    if (!existing) {
      const now = nowISO();
      await db.runAsync(
        'INSERT INTO saved_link_tags (id, link_id, tag_id, created_at) VALUES (?, ?, ?, ?)',
        [generateUUID(), linkId, tag.id, now]
      );
      await db.runAsync(
        'UPDATE link_tags SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?',
        [now, tag.id]
      );
    }
    return tag;
  }

  /** 从链接移除标签 */
  static async removeTagFromLink(linkId: string, tagId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'DELETE FROM saved_link_tags WHERE link_id = ? AND tag_id = ?',
      [linkId, tagId]
    );
    await db.runAsync(
      'UPDATE link_tags SET usage_count = MAX(0, usage_count - 1), updated_at = ? WHERE id = ?',
      [nowISO(), tagId]
    );
  }

  /** 删除一个链接标签（同时清除所有关联） */
  static async deleteLinkTag(tagId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM saved_link_tags WHERE tag_id = ?', [tagId]);
    await db.runAsync('DELETE FROM link_tags WHERE id = ?', [tagId]);
  }

  /** 创建链接标签（重名则忽略，返回已存在或新建的标签） */
  static async createLinkTag(name: string, color?: string): Promise<LinkTag> {
    const db = await getDB();
    const trimmed = name.trim();
    if (!trimmed) throw new Error('标签名不能为空');
    const existing = await SavedLinkService.getLinkTagByName(trimmed);
    if (existing) return existing;
    const tag: LinkTag = {
      id: generateUUID(),
      name: trimmed,
      color: color ?? null,
      usage_count: 0,
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await db.runAsync(
      'INSERT OR IGNORE INTO link_tags (id, name, color, usage_count, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
      [tag.id, tag.name, tag.color, tag.created_at, tag.updated_at]
    );
    const created = await SavedLinkService.getLinkTagByName(trimmed);
    return created ?? tag;
  }
}
