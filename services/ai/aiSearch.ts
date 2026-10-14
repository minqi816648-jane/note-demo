import { getSmartClient } from './index';
import { retrieveNotes } from './rag';

export interface AiSearchCitation {
  id: string;
  title: string;
}

export interface AiSearchResult {
  answer: string;
  citations: AiSearchCitation[];
}

/**
 * AI 语义搜索：检索相关非敏感笔记作为上下文，让模型基于笔记生成回答，并返回引用来源。
 */
export async function aiSearch(query: string, preferred?: 'qwen' | 'deepseek'): Promise<AiSearchResult | null> {
  const q = query.trim();
  if (!q) return null;

  const smart = await getSmartClient(preferred);
  if (!smart) return null;

  const notes = await retrieveNotes(q, 5);
  const citations = notes.map((n) => ({ id: n.id, title: n.title || '无标题笔记' }));

  const context = notes
    .map((n, i) => `[${i + 1}] 标题：${n.title || '无标题'}\n内容：${(n.content_text || '').slice(0, 300)}`)
    .join('\n\n');

  const messages = [
    {
      role: 'system' as const,
      content: '你是 note-demo 的 AI 笔记助手。请基于下方笔记片段简洁、准确地回答用户问题；若与笔记无关则明确说明。回答末尾可引用对应编号。',
    },
    {
      role: 'system' as const,
      content: context ? `相关笔记片段：\n${context}` : '未检索到相关笔记，请基于通用知识回答。',
    },
    {
      role: 'user' as const,
      content: q,
    },
  ];

  try {
    const res = await smart.client.chatStream(messages, () => {});
    return { answer: res.content || '', citations };
  } catch (error) {
    console.warn('AI 语义搜索失败:', error);
    return null;
  }
}

/**
 * 生成笔记摘要（带回引用来源）：检索与笔记内容相关的非敏感笔记作为上下文，
 * 模型生成摘要并附带被引用的笔记来源。
 */
export interface AiSummaryResult {
  summary: string;
  citations: AiSearchCitation[];
}

export async function summarizeNoteWithRefs(
  noteId: string,
  contentText: string,
  preferred?: 'qwen' | 'deepseek'
): Promise<AiSummaryResult | null> {
  const text = contentText.trim();
  const smart = await getSmartClient(preferred);
  if (!smart) return null;

  // 以笔记内容作为检索 query，取相关笔记
  const related = await retrieveNotes(text.slice(0, 120) || noteId, 5);
  // 排除自身
  const refs = related.filter((n) => n.id !== noteId);
  const citations: AiSearchCitation[] = refs.map((n) => ({ id: n.id, title: n.title || '无标题笔记' }));

  const context = refs
    .map((n, i) => `[${i + 1}] 标题：${n.title || '无标题'}\n内容：${(n.content_text || '').slice(0, 300)}`)
    .join('\n\n');

  const messages = [
    {
      role: 'system' as const,
      content: '你是 note-demo 的 AI 笔记助手。请为下面这篇笔记生成一段简洁、准确的中文摘要，可参考相关笔记片段。若参考了某篇，在摘要末尾用 [n] 标注。',
    },
    {
      role: 'system' as const,
      content: context ? `相关笔记片段：\n${context}` : '无相关笔记。',
    },
    {
      role: 'user' as const,
      content: `笔记内容：\n${text.slice(0, 1500)}`,
    },
  ];

  try {
    const res = await smart.client.chatStream(messages, () => {});
    return { summary: res.content || '', citations };
  } catch (error) {
    console.warn('AI 摘要（带回引）失败:', error);
    return null;
  }
}
