// ============================================
// RAG 检索：让 AI 对话能读取用户笔记内容
// 检索时排除敏感笔记（隐私承诺）
// ============================================

import { getDB } from '../db/database';
import { likePattern } from '../search.service';

interface RagNote {
  id: string;
  title: string;
  content_text: string;
  category_name: string | null;
  tag_names: string | null;
}

/**
 * 检索与 query 相关的非敏感笔记片段（关键词 + 标签扩展）。
 * @returns 排序后的笔记数组
 */
export async function retrieveNotes(query: string, limit = 5): Promise<RagNote[]> {
  const q = query.trim();
  if (!q) return [];

  const db = await getDB();
  const like = likePattern(q);

  const selectCols = `
    n.id, n.title, n.content_text,
    c.name AS category_name,
    (SELECT GROUP_CONCAT(t.name, ' ')
       FROM tags t INNER JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = n.id) AS tag_names
  `;

  // 关键词匹配标题/内容，排除敏感与已删除
  const keywordHits = await db.getAllAsync<RagNote>(
    `SELECT ${selectCols}
     FROM notes n
     LEFT JOIN categories c ON n.category_id = c.id
     WHERE n.deleted_at IS NULL
       AND n.is_sensitive = 0
       AND (n.title LIKE ? ESCAPE '\\' OR n.content_text LIKE ? ESCAPE '\\')
     ORDER BY n.updated_at DESC
     LIMIT ?`,
    [like, like, limit * 2]
  );

  // 补充：标签沾边（关键词出现在标签里）
  const tagHits = await db.getAllAsync<RagNote>(
    `SELECT ${selectCols}
     FROM notes n
     LEFT JOIN categories c ON n.category_id = c.id
     WHERE n.deleted_at IS NULL
       AND n.is_sensitive = 0
       AND n.id IN (
         SELECT nt.note_id FROM note_tags nt
         INNER JOIN tags t ON t.id = nt.tag_id
         WHERE t.name LIKE ? ESCAPE '\'
       )
     ORDER BY n.updated_at DESC
     LIMIT ?`,
    [like, limit]
  );

  // 合并去重
  const seen = new Set<string>();
  const merged = [...keywordHits, ...tagHits].filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return merged.slice(0, limit);
}

/**
 * 将检索到的笔记组装为对话上下文（system 片段文本）
 */
export function buildRagContext(notes: RagNote[], query: string): string {
  if (notes.length === 0) return '';

  const blocks = notes.map((n, i) => {
    const meta = [n.category_name, n.tag_names].filter(Boolean).join('，');
    const body = (n.content_text || '').slice(0, 300);
    return `[笔记${i + 1}] 标题：${n.title || '无标题'}\n${meta ? `标签：${meta}\n` : ''}内容：${body}`;
  });

  return [
    '以下是用户笔记库中与当前问题相关的检索片段，请优先基于这些内容回答（如与问题无关则忽略）：',
    blocks.join('\n\n'),
  ].join('\n\n');
}
