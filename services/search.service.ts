// ============================================
// 本地全文搜索服务
// 基于 SQLite FTS5，搜索笔记标题/内容/标签/分类
// ============================================

import { getDB } from './db/database';
import type { Note } from '../src/constants/theme';

/**
 * 将用户输入转义为 SQLite LIKE 通配符安全的包含模式。
 * 转义 `\ % _`（默认转义符为反斜杠），避免用户输入 `%`/`_` 被当成通配符。
 */
export function likePattern(input: string, escape = '\\'): string {
  const esc = (s: string) => s.replace(/[\\%_]/g, (m) => escape + m);
  return `%${esc(input)}%`;
}

export interface SearchResultItem {
  id: string;
  type: 'note' | 'todo' | 'link';
  title: string;
  snippet: string;
  note_id?: string;
  created_at: string;
  updated_at: string;
  relevance_score: number;
  category_id: string | null;
}

/**
 * 重新同步某篇笔记的 FTS 索引（含分类与标签）。
 *
 * 说明：历史实现使用 contentless FTS5 的 'delete'+insert 命令，在部分 Android
 * 设备上会触发 expo-sqlite 原生语句 `finalizeAsync / execAsync 已被拒绝` 的竞态，
 * 导致 AI 分类被中断。当前搜索引擎已改用稳定性高的 LIKE 检索，因此这里保留为
 * 空操作（幂等、无副作用），逐一保留调用点以免改动业务逻辑。
 */
export async function syncFtsForNote(_noteId: string): Promise<void> {
  // 不再写入 FTS，规避原生语句竞态崩溃
}


/**
 * 按标签名检索笔记（标签模式搜索）
 */
export async function searchByTag(tagName: string, options?: { categoryId?: string }, limit = 30): Promise<SearchResultItem[]> {
  const q = tagName.trim();
  if (!q) return [];
  const db = await getDB();
  const pattern = likePattern(q);
  const values: any[] = [pattern];
  let catSql = '';
  if (options?.categoryId) {
    catSql = ' AND n.category_id = ?';
    values.push(options.categoryId);
  }
  values.push(limit);
  const notes = await db.getAllAsync<Note>(
    `SELECT n.* FROM notes n
     INNER JOIN note_tags nt ON n.id = nt.note_id
     INNER JOIN tags t ON t.id = nt.tag_id
     WHERE n.deleted_at IS NULL AND t.name LIKE ? ESCAPE '\\' ${catSql}
     ORDER BY n.updated_at DESC LIMIT ?`,
    values
  );
  return notes.map((n) => ({
    id: n.id,
    type: 'note' as const,
    title: n.title || '无标题笔记',
    snippet: n.content_text || '',
    note_id: n.id,
    category_id: n.category_id ?? null,
    created_at: n.created_at,
    updated_at: n.updated_at,
    relevance_score: 0.8,
  }));
}

export interface SearchResults {
  total: number;
  items: SearchResultItem[];
}

/**
 * 综合搜索（笔记 + 待办）
 */
export async function searchAll(keyword: string, options?: { categoryId?: string }): Promise<SearchResults> {
  const q = keyword.trim();
  if (!q) return { total: 0, items: [] };

  const noteResults = await searchNotes(q, options);
  const todoResults = await searchTodos(q);

  // 合并：笔记优先
  const items = [...noteResults, ...todoResults].slice(0, 50);
  return { total: items.length, items };
}

/**
 * 搜索笔记。
 * 说明：原 FTS5(contentless) 索引的维护在部分 Android 设备上会触发
 * expo-sqlite 原生语句 finalizeAsync/execAsync 竞态崩溃，故改为稳定的
 * LIKE 检索（对本地笔记量完全够用），彻底规避该崩溃。
 */
export async function searchNotes(keyword: string, options?: { categoryId?: string }, limit = 30): Promise<SearchResultItem[]> {
  const q = keyword.trim();
  if (!q) return [];
  return fallbackNoteSearch(q, limit, options?.categoryId);
}

/** 从正文中截取关键词附近的摘要 */
function makeSnippet(text: string, q: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx >= 0) {
    return text.slice(Math.max(0, idx - 20), idx + q.length + 40);
  }
  return text.slice(0, 80);
}

/**
 * 搜索待办（标题/描述）
 */
export async function searchTodos(keyword: string, limit = 20): Promise<SearchResultItem[]> {
  const q = keyword.trim();
  if (!q) return [];
  const db = await getDB();
  const pattern = likePattern(q);
  const todos = await db.getAllAsync<{ id: string; title: string; description: string | null; note_id: string | null; created_at: string; updated_at: string }>(
    `SELECT id, title, description, note_id, created_at, updated_at
     FROM todos
     WHERE is_deleted = 0 AND (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')
     ORDER BY updated_at DESC LIMIT ?`,
    [pattern, pattern, limit]
  );

  return todos.map((t) => ({
    id: t.id,
    type: 'todo' as const,
    title: t.title,
    snippet: t.description || '',
    note_id: t.note_id ?? undefined,
    created_at: t.created_at,
    updated_at: t.updated_at,
    category_id: null,
    relevance_score: 0.5,
  }));
}

/** FTS 回退：LIKE 搜索笔记 */
async function fallbackNoteSearch(q: string, limit: number, categoryId?: string): Promise<SearchResultItem[]> {
  const db = await getDB();
  const pattern = likePattern(q);
  const values: any[] = [pattern, pattern];
  let catSql = '';
  if (categoryId) {
    catSql = ' AND category_id = ?';
    values.push(categoryId);
  }
  values.push(limit);
  const notes = await db.getAllAsync<Note>(
    `SELECT * FROM notes
     WHERE deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR content_text LIKE ? ESCAPE '\\') ${catSql}
     ORDER BY updated_at DESC LIMIT ?`,
    values
  );

  return notes.map((n) => {
    const text = n.content_text || '';
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    const snippet =
      idx >= 0
        ? text.slice(Math.max(0, idx - 20), idx + q.length + 40)
        : text.slice(0, 80);
    return {
      id: n.id,
      type: 'note' as const,
      title: n.title || '无标题笔记',
      snippet,
      note_id: n.id,
      category_id: n.category_id ?? null,
      created_at: n.created_at,
      updated_at: n.updated_at,
      relevance_score: 1,
    };
  });
}

