import { getDB } from './db/database';
import type { Category } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';

/**
 * 分类服务层
 * 提供 Categories 表的 CRUD 操作
 */
export class CategoryService {
  /**
   * 创建分类
   */
  static async createCategory(data: Partial<Category>): Promise<Category> {
    const db = await getDB();
    const id = data.id || generateUUID();
    const now = nowISO();

    const category: Category = {
      id,
      name: data.name ?? '',
      slug: data.slug ?? data.name?.toLowerCase().replace(/\s+/g, '-') ?? '',
      icon: data.icon ?? null,
      color: data.color ?? null,
      is_system: data.is_system ?? 0,
      sort_order: data.sort_order ?? 0,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO categories (
        id, name, slug, icon, color, is_system, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id, category.name, category.slug, category.icon, category.color,
        category.is_system, category.sort_order, category.created_at, category.updated_at,
      ]
    );

    return category;
  }

  /**
   * 更新分类
   */
  static async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    const db = await getDB();
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields: (keyof Category)[] = [
      'name', 'slug', 'icon', 'color', 'is_system', 'sort_order',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field as keyof Category]);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await db.runAsync(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 删除分类
   */
  static async deleteCategory(id: string): Promise<void> {
    const db = await getDB();
    // 从笔记中移除该分类的引用
    await db.runAsync(
      'UPDATE notes SET category_id = NULL WHERE category_id = ?',
      [id]
    );
    // 删除分类
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }

  /**
   * 获取所有分类
   */
  static async getAllCategories(): Promise<Category[]> {
    const db = await getDB();
    return await db.getAllAsync<Category>(
      'SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC'
    );
  }

  /**
   * 获取系统预置分类
   */
  static async getSystemCategories(): Promise<Category[]> {
    const db = await getDB();
    return await db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE is_system = 1 ORDER BY sort_order ASC'
    );
  }

  /**
   * 获取自定义分类
   */
  static async getUserCategories(): Promise<Category[]> {
    const db = await getDB();
    return await db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE is_system = 0 ORDER BY sort_order ASC'
    );
  }

  /**
   * 按 ID 获取分类
   */
  static async getCategoryById(id: string): Promise<Category | null> {
    const db = await getDB();
    const category = await db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return category ?? null;
  }

  /**
   * 按 slug 获取分类
   */
  static async getCategoryBySlug(slug: string): Promise<Category | null> {
    const db = await getDB();
    const category = await db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE slug = ?',
      [slug]
    );
    return category ?? null;
  }
}
