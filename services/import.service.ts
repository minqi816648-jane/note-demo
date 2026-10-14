// ============================================
// 数据导入服务
// 当前支持：Markdown 笔记导入（.md / .txt）
// 兼容应用自身导出的单笔记 Markdown（round-trip）与任意 Markdown。
// ============================================

import { NoteService } from './note.service';
import { CategoryService } from './category.service';
import { TagService } from './tag.service';
import { File } from 'expo-file-system';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';

export interface MarkdownImportResult {
  created: number;
  skipped: number;
  titles: string[];
}

// 应用自身导出（ShareSheet/设置→导出）时的结尾标记
const EXPORT_FOOTER_RE = /^\s*[-\uff0d]{2,}\s*$/m;

/**
 * 从单个 Markdown 文本解析为一篇笔记。
 * 识别规则：
 *  - 首个 H1（`# xxx`）作为标题；无 H1 时用文件名（不带扩展名）。
 *  - 尾部 `---` + 说明行（应用导出脚注）会被剔除，不作为正文。
 *  - 可选 front-matter（`--- \n key: value \n ---`）中读取 category / tags。
 */
export async function parseMarkdownNote(
  text: string,
  fallbackTitle: string
): Promise<{ title: string; content_text: string; categoryName?: string; tagNames: string[] }> {
  // 去除 BOM
  let src = text.replace(/^\uFEFF/, '');

  let categoryName: string | undefined;
  let tagNames: string[] = [];

  // 前置 front-matter（YAML 风格，宽松解析）
  const fmMatch = src.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (fmMatch) {
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key === 'category') categoryName = val;
      if (key === 'tags' || key === 'tag') {
        tagNames = val.replace(/^\[|\]$/g, '').split(/,\s*|\s+/).map((s) => s.trim()).filter(Boolean);
      }
    }
    src = src.slice(fmMatch[0].length).replace(/^\s*\r?\n/, '');
  }

  // 去掉应用导出脚注（`---` 及之后的部分）
  src = src.split(EXPORT_FOOTER_RE)[0];

  let title = fallbackTitle;
  const h1 = src.match(/\s*^#\s+(.+?)\s*$/m);
  if (h1 && h1[1]) {
    title = h1[1].trim();
    // 去掉正文里的首个标题行
    src = src.replace(/\s*^#\s+.+?\s*$/m, '');
  }

  const content_text = src.trim();

  return { title, content_text, categoryName, tagNames };
}

/**
 * 把解析出的笔记写入数据库（含可选分类/标签）。
 * 由于 createNote / addTagToNote 内部已各自 syncFtsForNote 维护索引，
 * 此处无需额外同步。返回是否成功创建（标题与正文均为空视为跳过）。
 */
export async function importMarkdownNote(
  text: string,
  fallbackTitle: string
): Promise<{ created: boolean; title: string }> {
  const parsed = await parseMarkdownNote(text, fallbackTitle);
  const finalTitle = parsed.title || fallbackTitle || '导入笔记';

  if (!parsed.title.trim() && !parsed.content_text.trim()) {
    return { created: false, title: finalTitle };
  }

  let categoryId: string | null = null;
  if (parsed.categoryName) {
    const cat = await CategoryService.getCategoryBySlug(parsed.categoryName);
    // 找不到 slug 时尝试按名称匹配（名称匹配需手写，避免额外请求）
    categoryId = cat?.id ?? null;
  }

  const createdNote = await NoteService.createNote({
    title: finalTitle,
    content_text: parsed.content_text,
    content: '',
    category_id: categoryId,
  });

  // 后续（打标签）失败时补偿：删除刚创建的笔记，避免孤儿笔记
  try {
    if (parsed.tagNames.length > 0) {
      // setNoteTags 会替换原有标签；清空后逐个添加，交由 addTag 维护使用计数
      const current = await TagService.getTagsByNoteId(createdNote.id);
      for (const t of current) {
        await TagService.removeTagFromNote(createdNote.id, t.id);
      }
      for (const name of parsed.tagNames) {
        await TagService.addTagToNote(createdNote.id, name);
      }
    }
  } catch (error) {
    await NoteService.hardDeleteNote(createdNote.id).catch(() => {});
    throw error;
  }

  return { created: true, title: finalTitle };
}

/**
 * 批量导入多个 Markdown 文本，返回汇总结果。
 */
export async function importMarkdownNotes(
  items: { text: string; fallbackTitle: string }[]
): Promise<MarkdownImportResult> {
  const result: MarkdownImportResult = { created: 0, skipped: 0, titles: [] };
  for (const item of items) {
    const r = await importMarkdownNote(item.text, item.fallbackTitle);
    if (r.created) {
      result.created += 1;
      result.titles.push(r.title);
    } else {
      result.skipped += 1;
    }
  }
  return result;
}

/**
 * 把文件 URI 读为文本（.md/.txt 等）。
 */
export async function readTextFile(uri: string): Promise<string> {
  const file = new File(uri);
  return await file.text();
}

/** 工具：供未来 JSON 全量备份还原使用（占位，暂不实现）。 */
export async function importBackupJson(_json: string): Promise<MarkdownImportResult> {
  throw new Error('JSON 全量备份还原暂未实现');
}
