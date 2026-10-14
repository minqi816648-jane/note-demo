// ============================================
// 通义千问 (DashScope) 客户端
// 参考《04-API接口设计.md》3.1
// ============================================

import type {
  AIClient,
  AIMessageInput,
  AIProviderConfig,
  AIStreamChunk,
  ChatOptions,
  ClassificationResult,
  SummarizeOptions,
  ExtractedTodo,
} from './types';
import {
  classifyWithClient,
  summarizeWithClient,
  translateWithClient,
  polishWithClient,
  continueWithClient,
  extractTodosWithClient,
} from './utils';
import { consumeSSE } from './sse';

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-turbo';

interface ChatCompletionResponse {
  choices: { message?: { content?: string }; delta?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class QwenClient implements AIClient {
  readonly provider = 'qwen' as const;
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
  }

  private buildUrl(): string {
    return `${DASHSCOPE_BASE}/chat/completions`;
  }

  private async request(
    messages: AIMessageInput[],
    options?: ChatOptions
  ): Promise<ChatCompletionResponse> {
    const res = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`通义千问请求失败 (${res.status}): ${text.slice(0, 300)}`);
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async chat(messages: AIMessageInput[], options?: ChatOptions): Promise<string> {
    const data = await this.request(messages, options);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('通义千问返回了空内容');
    }
    return content;
  }

  async chatStream(
    messages: AIMessageInput[],
    onChunk: (chunk: AIStreamChunk) => void,
    options?: ChatOptions
  ): Promise<{ content: string; usage?: AIStreamChunk['usage'] }> {
    const res = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`通义千问流式请求失败 (${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.body) {
      throw new Error('通义千问流式响应缺少 body');
    }

    let full = '';
    let inputTokens = 0;
    let outputTokens = 0;

    await consumeSSE(
      res.body,
      (payload) => {
        try {
          const json = JSON.parse(payload) as ChatCompletionResponse;
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            onChunk({ content: delta, done: false });
          }
          if (json.usage) {
            inputTokens = json.usage.prompt_tokens ?? 0;
            outputTokens = json.usage.completion_tokens ?? 0;
          }
        } catch {
          // 忽略非 JSON 的 SSE 数据
        }
      },
      () => {}
    );

    onChunk({
      content: '',
      done: true,
      usage: { inputTokens, outputTokens },
    });

    return { content: full, usage: { inputTokens, outputTokens } };
  }

  async classify(content: string, categories?: string[]): Promise<ClassificationResult> {
    return classifyWithClient(this, content, categories);
  }

  async summarize(content: string, options?: SummarizeOptions): Promise<string> {
    return summarizeWithClient(this, content, options);
  }

  async translate(text: string, targetLang?: string): Promise<string> {
    return translateWithClient(this, text, targetLang);
  }

  async polish(text: string): Promise<string> {
    return polishWithClient(this, text);
  }

  async continue(text: string): Promise<string> {
    return continueWithClient(this, text);
  }

  async extractTodos(text: string): Promise<ExtractedTodo[]> {
    return extractTodosWithClient(this, text);
  }
}
