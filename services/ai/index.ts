// ============================================
// AI 服务门面
// 统一入口：Provider 选择、Key 读取、分类/摘要/对话
// ============================================

import type {
  AIClient,
  AIProviderConfig,
  AIProviderName,
  AIMessageInput,
  AIStreamChunk,
  ChatOptions,
  ClassificationResult,
  SummarizeOptions,
  ExtractedTodo,
} from './types';
import { QwenClient } from './qwen.client';
import { DeepSeekClient } from './deepseek.client';
import { getApiKey } from './keyStore';

export type {
  AIClient,
  AIProviderName,
  AIMessageInput,
  AIStreamChunk,
  ClassificationResult,
  ExtractedTodo,
};

const DEFAULT_PROVIDER: AIProviderName = 'qwen';
const FALLBACK_PROVIDERS: AIProviderName[] = ['deepseek'];

/**
 * 根据配置构建 Provider 客户端
 */
export function createClient(
  provider: AIProviderName,
  apiKey: string,
  model?: string
): AIClient {
  const config: AIProviderConfig = { apiKey, model };
  switch (provider) {
    case 'deepseek':
      return new DeepSeekClient(config);
    case 'qwen':
    default:
      return new QwenClient(config);
  }
}

/**
 * 获取指定 Provider 的客户端；若未配置 Key 返回 null
 */
export async function getClient(provider?: AIProviderName): Promise<AIClient | null> {
  const target = provider || DEFAULT_PROVIDER;
  const apiKey = await getApiKey(target);
  if (!apiKey) return null;
  return createClient(target, apiKey);
}

/**
 * 智能获取客户端：优先指定 Provider，若未配置则降级到已配置的备选。
 * 一个都没有会返回 null。
 */
export async function getSmartClient(
  preferred?: AIProviderName
): Promise<{ client: AIClient; provider: AIProviderName } | null> {
  const preferredP = preferred || DEFAULT_PROVIDER;
  const candidates: AIProviderName[] = [preferredP, ...FALLBACK_PROVIDERS.filter((p) => p !== preferredP), 'qwen'];

  const seen = new Set<AIProviderName>();
  for (const provider of candidates) {
    if (seen.has(provider)) continue;
    seen.add(provider);
    const apiKey = await getApiKey(provider);
    if (apiKey) {
      return { client: createClient(provider, apiKey), provider };
    }
  }
  return null;
}

const ALL_CATEGORY_SLUGS = ['work', 'study', 'life', 'idea', 'todo', 'fin'];

/**
 * AI 分类笔记。
 */
export async function classifyNote(
  content: string,
  preferred?: AIProviderName
): Promise<ClassificationResult | null> {
  const smart = await getSmartClient(preferred);
  if (!smart) return null;
  return smart.client.classify(content, ALL_CATEGORY_SLUGS);
}

/**
 * 生成笔记摘要
 */
export async function summarizeNote(
  content: string,
  preferred?: AIProviderName,
  maxLength?: number
): Promise<string | null> {
  const smart = await getSmartClient(preferred);
  if (!smart) return null;
  return smart.client.summarize(content, { maxLength });
}

/**
 * 翻译文本
 */
export async function translateText(
  text: string,
  preferred?: AIProviderName,
  targetLang?: string
): Promise<string | null> {
  const smart = await getSmartClient(preferred);
  if (!smart) return null;
  return smart.client.translate(text, targetLang);
}

/**
 * 润色文本
 */
export async function polishText(
  text: string,
  preferred?: AIProviderName
): Promise<string | null> {
  const smart = await getSmartClient(preferred);
  if (!smart) return null;
  return smart.client.polish(text);
}

/**
 * 续写文本
 */
export async function continueText(
  text: string,
  preferred?: AIProviderName
): Promise<string | null> {
  const smart = await getSmartClient(preferred);
  if (!smart) return null;
  return smart.client.continue(text);
}

/**
 * 提取待办
 */
export async function extractTodosFromText(
  text: string,
  preferred?: AIProviderName
): Promise<ExtractedTodo[] | null> {
  const smart = await getSmartClient(preferred);
  if (!smart) return null;
  return smart.client.extractTodos(text);
}

export { ALL_CATEGORY_SLUGS as CATEGORY_SLUGS };
