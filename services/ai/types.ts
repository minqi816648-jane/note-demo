// ============================================
// AI 服务抽象层类型定义
// 参考《04-API接口设计.md》第2.3节与第3.1/3.2节
// ============================================

export type AIProviderName = 'qwen' | 'deepseek';

/** 对话消息 */
export interface AIMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 分类结果 */
export interface ClassificationResult {
  categoryId: string;
  tags: string[];
  summary: string;
  isTodo: boolean;
  links: string[];
}

/** 摘要选项 */
export interface SummarizeOptions {
  maxLength?: number;
  language?: string;
}

/** 提取出的待办 */
export interface ExtractedTodo {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 1 | 2 | 3;
}

/** 翻译选项 */
export interface TranslateOptions {
  targetLang?: string;
}

/** 流式响应块 */
export interface AIStreamChunk {
  /** 增量文本内容（可能为空） */
  content: string;
  /** 是否结束 */
  done: boolean;
  /** 消费的 token 数（仅结束时有） */
  usage?: { inputTokens: number; outputTokens: number };
}

/** 统一 AI 客户端接口 */
export interface AIClient {
  /** Provider 名称 */
  readonly provider: AIProviderName;
  /** 对话（非流式） */
  chat(messages: AIMessageInput[], options?: ChatOptions): Promise<string>;
  /** 流式对话 */
  chatStream(
    messages: AIMessageInput[],
    onChunk: (chunk: AIStreamChunk) => void,
    options?: ChatOptions
  ): Promise<{ content: string; usage?: AIStreamChunk['usage'] }>;
  /** 文本分类 + 打标签 + 摘要 */
  classify(content: string, categories?: string[]): Promise<ClassificationResult>;
  /** 内容摘要 */
  summarize(content: string, options?: SummarizeOptions): Promise<string>;
  /** 文本翻译 */
  translate(text: string, targetLang?: string): Promise<string>;
  /** 内容润色 */
  polish(text: string): Promise<string>;
  /** 续写 */
  continue(text: string): Promise<string>;
  /** 提取待办 */
  extractTodos(text: string): Promise<ExtractedTodo[]>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Provider 配置 */
export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}
