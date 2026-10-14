import { getDB } from './db/database';
import type { Folder } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';

/**
 * 文件夹服务层
 * 提供 Folders 表的完整 CRUD 操作及子文件夹管理
 */
export class FolderService {
  /**
   * 创建文件夹
   */
  static async createFolder(data: Partial<Folder>): Promise<Folder> {
    const db = await getDB();
    const id = data.id || generateUUID();
    const now = nowISO();

    const folder: Folder = {
      id,
      parent_id: data.parent_id ?? null,
      name: data.name ?? '',
      icon: data.icon ?? null,
      color: data.color ?? null,
      sort_order: data.sort_order ?? 0,
      note_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await db.runAsync(
      `INSERT INTO folders (
        id, parent_id, name, icon, color, sort_order,
        note_count, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folder.id, folder.parent_id, folder.name, folder.icon, folder.color,
        folder.sort_order, 0, folder.created_at, folder.updated_at, null,
      ]
    );

    return folder;
  }

  /**
   * 更新文件夹
   */
  static async updateFolder(id: string, data: Partial<Folder>): Promise<void> {
    const db = await getDB();
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields: (keyof Folder)[] = [
      'parent_id', 'name', 'icon', 'color', 'sort_order', 'note_count', 'deleted_at',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field as keyof Folder]);
      }
    }

    fields.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await db.runAsync(
      `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 软删除文件夹（同时删除其子文件夹和包含的笔记）
   */
  static async softDeleteFolder(id: string): Promise<void> {
    const db = await getDB();
    const now = nowISO();

    // 获取所有子文件夹 ID（递归）
    const childIds = await FolderService.getAllChildFolderIds(id);
    const allIds = [id, ...childIds];

    // 批量软删除文件夹
    const placeholders = allIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE folders SET deleted_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [now, now, ...allIds]
    );

    // 同时软删除文件夹内的笔记
    await db.runAsync(
      `UPDATE notes SET deleted_at = ?, updated_at = ? WHERE parent_id IN (${placeholders})`,
      [now, now, ...allIds]
    );
  }

  /**
   * 恢复文件夹（与其删除时一并软删的笔记，保持删除/恢复对称）
   */
  static async restoreFolder(id: string): Promise<void> {
    const db = await getDB();
    const now = nowISO();
    const childIds = await FolderService.getAllChildFolderIdsIncludingDeleted(id);
    const allIds = [id, ...childIds];
    const placeholders = allIds.map(() => '?').join(',');

    await db.runAsync(
      'UPDATE folders SET deleted_at = NULL, updated_at = ? WHERE id IN (' + placeholders + ')',
      [now, ...allIds]
    );
    await db.runAsync(
      'UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE parent_id IN (' + placeholders + ')',
      [now, ...allIds]
    );
  }

  /**
   * 获取文件夹详情
   */
  static async getFolderById(id: string): Promise<Folder | null> {
    const db = await getDB();
    const folder = await db.getFirstAsync<Folder>(
      'SELECT * FROM folders WHERE id = ?',
      [id]
    );
    return folder ?? null;
  }

  /**
   * 获取顶层文件夹列表（note_count 为实时计算，不依赖冗余缓存）
   */
  static async getRootFolders(): Promise<Folder[]> {
    const db = await getDB();
    return await db.getAllAsync<Folder>(
      `SELECT f.*,
              (SELECT COUNT(*) FROM notes n
                WHERE n.parent_id = f.id AND n.deleted_at IS NULL) AS note_count
       FROM folders f
       WHERE f.parent_id IS NULL AND f.deleted_at IS NULL
       ORDER BY f.sort_order ASC`
    );
  }

  /**
   * 获取某个文件夹下的子文件夹
   */
  static async getChildFolders(parentId: string): Promise<Folder[]> {
    const db = await getDB();
    return await db.getAllAsync<Folder>(
      `SELECT f.*,
              (SELECT COUNT(*) FROM notes n
                WHERE n.parent_id = f.id AND n.deleted_at IS NULL) AS note_count
       FROM folders f
       WHERE f.parent_id = ? AND f.deleted_at IS NULL
       ORDER BY f.sort_order ASC`,
      [parentId]
    );
  }

  /**
   * 获取所有未删除的文件夹（note_count 为实时计算，不依赖冗余缓存）
   */
  static async getAllFolders(): Promise<Folder[]> {
    const db = await getDB();
    return await db.getAllAsync<Folder>(
      `SELECT f.*,
              (SELECT COUNT(*) FROM notes n
                WHERE n.parent_id = f.id AND n.deleted_at IS NULL) AS note_count
       FROM folders f
       WHERE f.deleted_at IS NULL
       ORDER BY f.sort_order ASC, f.created_at ASC`
    );
  }

  /**
   * 递归获取所有子文件夹 ID
   */
  static async getAllChildFolderIds(parentId: string): Promise<string[]> {
    const db = await getDB();
    const result: string[] = [];
    // 虽然 SQLite 不支持递归 CTE 在所有版本中，这里用迭代方式
    let queue = [parentId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM folders WHERE parent_id = ? AND deleted_at IS NULL',
        [current]
      );
      
      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }

    return result;
  }

  /**
   * 递归获取所有子文件夹 ID（含软删除的子文件夹，供恢复逻辑用）
   */
  static async getAllChildFolderIdsIncludingDeleted(parentId: string): Promise<string[]> {
    const db = await getDB();
    const result: string[] = [];
    let queue = [parentId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM folders WHERE parent_id = ?',
        [current]
      );
      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }
    return result;
  }

  /**
   * 更新文件夹的 note_count（笔记数量冗余缓存）
   */
  static async refreshNoteCount(folderId: string): Promise<void> {
    const db = await getDB();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE parent_id = ? AND deleted_at IS NULL',
      [folderId]
    );
    
    await db.runAsync(
      'UPDATE folders SET note_count = ?, updated_at = ? WHERE id = ?',
      [result?.count ?? 0, nowISO(), folderId]
    );
  }

  /**
   * 获取文件夹层级路径 (如: 工作 > 项目A > 文档)
   */
  static async getFolderPath(folderId: string): Promise<Folder[]> {
    const db = await getDB();
    const path: Folder[] = [];
    let currentId: string | null = folderId;

    // 防止死循环，最多10层
    for (let i = 0; i < 10 && currentId; i++) {
      const folder: Folder | null = await db.getFirstAsync<Folder>(
        'SELECT * FROM folders WHERE id = ?',
        [currentId]
      );
      
      if (!folder) break;
      
      path.unshift(folder);
      currentId = folder.parent_id;
    }

    return path;
  }
}
