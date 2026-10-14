// ============================================
// AI 自动分类 + 打标签 + 摘要
// 保存笔记后可调用，写入 notes.category_id / ai_tags / ai_summary 与 tags 关联
// ============================================

import { NoteService } from '../note.service';
import { TagService } from '../tag.service';
import { getDB } from '../db/database';
import { nowISO } from '../../src/utils/date';
import { classifyNote, CATEGORY_SLUGS } from './index';
import { syncFtsForNote } from '../search.service';

/**
 * 对一篇笔记执行 AI 分类并写入数据库。
 * 无 API Key、敏感笔记或分类失败时静默返回 false，不影响保存主流程。
 * 分类成功后将标记为「待确认」（ai_classify_confirmed = 0）。
 */
export async function autoClassifyNote(noteId: string, contentText: string): Promise<boolean> {
  if (!contentText.trim()) return false;

  // 敏感笔记禁止发送到 AI（隐私承诺）
  const note = await NoteService.getNoteById(noteId);
  if (note?.is_sensitive === 1) return false;

  try {
    const result = await classifyNote(contentText);
    if (!result) return false;

    const db = await getDB();

    // 将 slug 转换为实际分类 ID（categories 表 id，如 cat_work）
    let categoryDbId: string | null = null;
    if (result.categoryId) {
      const cat = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE slug = ?',
        [result.categoryId]
      );
      categoryDbId = cat?.id ?? null;
    }

    // 更新分类、AI 标签、AI 摘要，并标记为待确认
    await db.runAsync(
      `UPDATE notes
       SET category_id = ?, ai_tags = ?, ai_summary = ?, ai_classify_confirmed = 0, updated_at = ?
       WHERE id = ?`,
      [categoryDbId, JSON.stringify(result.tags), result.summary || null, nowISO(), noteId]
    );

    // 同步标签关联（AI 标签写入 tags 表，便于搜索与展示）
    if (result.tags.length > 0) {
      await TagService.setNoteTags(noteId, result.tags);
    }

    // 刷新 FTS 索引（含新分类与标签）
    await syncFtsForNote(noteId);

    return true;
  } catch (error) {
    console.warn('AI 自动分类失败:', error);
    return false;
  }
}

/**
 * 手动重跑某笔记的 AI 分类（供用户触发）
 */
export async function rerunAutoClassify(noteId: string): Promise<boolean> {
  const note = await NoteService.getNoteById(noteId);
  if (!note) return false;
  const contentText = note.content_text || note.title;
  return autoClassifyNote(noteId, contentText);
}

/**
 * 用户确认一篇笔记的分类结果：
 * - 应用用户（或 AI）给定的分类与标签
 * - 同步 tags 关联
 * - 标记为已确认
 */
export async function confirmNoteClassification(
  noteId: string,
  categoryId: string | null,
  tags: string[]
): Promise<void> {
  await NoteService.confirmClassification(noteId, categoryId, tags);
  await TagService.setNoteTags(noteId, tags);
  await syncFtsForNote(noteId);
}

/**
 * 标记某笔记回到「待确认」状态（用户想重新审视）
 */
export async function markPendingNote(noteId: string): Promise<void> {
  await NoteService.setClassifyConfirmed(noteId, 0);
}

export { CATEGORY_SLUGS };
