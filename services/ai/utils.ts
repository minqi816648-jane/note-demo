// ============================================
// AI 客户端通用辅助：分类与摘要提示词 + 结果解析
// ============================================

import type {
  AIClient,
  AIMessageInput,
  ClassificationResult,
  SummarizeOptions,
  TranslateOptions,
  ExtractedTodo,
} from './types';

/** 构建分类请求的 prompts */
function buildClassifyMessages(content: string, categories?: string[]) {
  // categories 传入的是 slug 列表；为用户提供友好名称映射
  const slugToName: Record<string, string> = {
    work: '工作',
    study: '学习',
    life: '生活',
    idea: '想法',
    todo: '待办',
    fin: '财务',
  };

  const options = categories?.length
    ? categories.map((s) => `${s}(${slugToName[s] || s})`).join('、')
    : 'work(工作)、study(学习)、life(生活)、idea(想法)、todo(待办)、fin(财务)';

  const system = [
    '你是智能笔记分类助手。请根据笔记内容判断分类、生成标签和摘要。',
    `可选的分类（请原样返回其中之一的 slug）：${options}`,
    '严格以 JSON 输出，格式为：',
    '{"category_id":"分类的slug，若不匹配任一选项则返回空字符串","tags":["标签1","标签2","最多5个"],"summary":"一句话摘要","is_todo":布尔值,"links":["识别到的URL"]}',
    '只输出 JSON，不要输出任何其他文字或代码块标记。',
  ].join('\n');

  const user = `请对以下笔记进行分类与打标签：\n\n${content.trim().slice(0, 6000)}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ] as AIMessageInput[];
}

/** 基于某个 client 执行分类 */
export async function classifyWithClient(
  client: Pick<AIClient, 'chat'>,
  content: string,
  categories?: string[]
): Promise<ClassificationResult> {
  const messages = buildClassifyMessages(content, categories);
  const raw = await client.chat(messages, { temperature: 0.3 });
  return parseClassification(raw, categories);
}

/** 构建摘要请求的 prompts */
export async function summarizeWithClient(
  client: Pick<AIClient, 'chat'>,
  content: string,
  options?: SummarizeOptions
): Promise<string> {
  const maxLength = options?.maxLength ?? 150;
  const language = options?.language ?? '中文';
  const system = `你是笔记摘要助手。请用${language}概括以下内容的要点，控制在 ${maxLength} 字以内，直接输出摘要正文即可。`;
  const text = content.trim().slice(0, 6000);

  const raw = await client.chat([
    { role: 'system', content: system },
    { role: 'user', content: text },
  ]);
  return raw.trim();
}

/** 翻译 */
export async function translateWithClient(
  client: Pick<AIClient, 'chat'>,
  text: string,
  targetLang?: string
): Promise<string> {
  const lang = targetLang || '英文';
  const system = `你是专业翻译。请把用户的内容翻译成${lang}，只输出译文，不要加解释。`;
  const raw = await client.chat([
    { role: 'system', content: system },
    { role: 'user', content: text.slice(0, 6000) },
  ]);
  return raw.trim();
}

/** 润色 */
export async function polishWithClient(
  client: Pick<AIClient, 'chat'>,
  text: string
): Promise<string> {
  const system = '你是文字润色助手。请优化以下内容的表达（更通顺、更精炼、不改变原意），直接输出润色后的正文。';
  const raw = await client.chat([
    { role: 'system', content: system },
    { role: 'user', content: text.slice(0, 6000) },
  ]);
  return raw.trim();
}

/** 续写 */
export async function continueWithClient(
  client: Pick<AIClient, 'chat'>,
  text: string
): Promise<string> {
  const system = '你是写作续写助手。请承接以下内容的风格与主题，自然续写连贯的后续段落，直接输出续写正文，不要重复已给内容。';
  const raw = await client.chat([
    { role: 'system', content: system },
    { role: 'user', content: text.slice(-4000) },
  ]);
  return raw.trim();
}

/** 待办提取 */
export async function extractTodosWithClient(
  client: Pick<AIClient, 'chat'>,
  text: string
): Promise<ExtractedTodo[]> {
  const system = [
    '你是待办提取助手。请从下面的文本中提取所有可执行的待办事项。',
    '严格以 JSON 数组输出，格式：',
    '[{"title":"待办标题","description":"可选描述","dueDate":"可选 YYYY-MM-DD","priority":1|2|3}]',
    'priority: 1=普通 2=急·今天（今天必须完成）3=加急；无法确定则用 1。若没有可提取的待办，返回空数组 []。',
    '只输出 JSON，不要输出其他文字。',
  ].join('\n');

  const raw = await client.chat([
    { role: 'system', content: system },
    { role: 'user', content: text.trim().slice(0, 6000) },
  ]);
  return parseExtractedTodos(raw);
}

function parseExtractedTodos(raw: string): ExtractedTodo[] {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((t) => t && typeof t.title === 'string' && t.title.trim())
      .map((t) => ({
        title: t.title.trim(),
        description: typeof t.description === 'string' ? t.description : undefined,
        dueDate: typeof t.dueDate === 'string' ? t.dueDate : undefined,
        priority: priorityOf(t.priority),
      }));
  } catch {
    return [];
  }
}

function priorityOf(p: unknown): 1 | 2 | 3 {
  if (p === 2 || p === 3) return p;
  return 1;
}

/** 解析分类结果 JSON */
export function parseClassification(raw: string, categories?: string[]): ClassificationResult {
  const allowedSlugs: string[] =
    categories?.length
      ? categories
      : ['work', 'study', 'life', 'idea', 'todo', 'fin'];

  let json: any = null;
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    json = JSON.parse(cleaned);
  } catch {
    json = null;
  }

  const categoryId = typeof json?.category_id === 'string' ? json.category_id : '';
  const tags = Array.isArray(json?.tags)
    ? json.tags.filter((t: unknown): t is string => typeof t === 'string').slice(0, 5)
    : [];
  const summary = typeof json?.summary === 'string' ? json.summary : '';
  const isTodo = Boolean(json?.is_todo);
  const links = Array.isArray(json?.links)
    ? json.links.filter((l: unknown): l is string => typeof l === 'string')
    : [];

  const finalCategoryId = allowedSlugs.includes(categoryId) ? categoryId : '';
  return { categoryId: finalCategoryId, tags, summary, isTodo, links };
}
