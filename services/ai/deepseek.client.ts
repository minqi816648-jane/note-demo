// ============================================
// DeepSeek 客户端
// 参考《04-API接口设计.md》3.2
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
import { consumeSSE, streamChunkFromPayload } from './sse';

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

interface ChatCompletionResponse {
  choices: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class DeepSeekClient implements AIClient {
  readonly provider = 'deepseek' as const;
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
  }

  private buildUrl(): string {
    return `${DEEPSEEK_BASE}/chat/completions`;
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
        max_tokens: options?.maxTokens ?? 4096,
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek 请求失败 (${res.status}): ${text.slice(0, 300)}`);
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async chat(messages: AIMessageInput[], options?: ChatOptions): Promise<string> {
    const data = await this.request(messages, options);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek 返回了空内容');
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
        max_tokens: options?.maxTokens ?? 4096,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek 流式请求失败 (${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.body) {
      throw new Error('DeepSeek 流式响应缺少 body');
    }

    let full = '';
    let inputTokens = 0;
    let outputTokens = 0;

    await consumeSSE(
      res.body,
      (payload) => {
        // 流结束标记
        const json = safeParse(payload);
        if (json?.usage) {
          inputTokens = json.usage.prompt_tokens ?? 0;
          outputTokens = json.usage.completion_tokens ?? 0;
          return;
        }
        const chunk = streamChunkFromPayload(payload);
        if (chunk && chunk.content) {
          full += chunk.content;
          onChunk({ content: chunk.content, done: false });
        } else if (chunk?.done) {
          onChunk(chunk);
        }
      },
      () => {}
    );

    onChunk({ content: '', done: true, usage: { inputTokens, outputTokens } });
    return { content: full, usage: { inputTokens, outputTokens } };
  }

  classify(content: string, categories?: string[]): Promise<ClassificationResult> {
    return classifyWithClient(this, content, categories);
  }

  summarize(content: string, options?: SummarizeOptions): Promise<string> {
    return summarizeWithClient(this, content, options);
  }

  translate(text: string, targetLang?: string): Promise<string> {
    return translateWithClient(this, text, targetLang);
  }

  polish(text: string): Promise<string> {
    return polishWithClient(this, text);
  }

  continue(text: string): Promise<string> {
    return continueWithClient(this, text);
  }

  extractTodos(text: string): Promise<ExtractedTodo[]> {
    return extractTodosWithClient(this, text);
  }
}

function safeParse(payload: string): any | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
