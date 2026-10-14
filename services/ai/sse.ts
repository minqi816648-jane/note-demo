// ============================================
// SSE (Server-Sent Events) 流式解析工具
// 兼容 OpenAI / DashScope 兼容模式返回的 text/event-stream
// ============================================

import type { AIStreamChunk } from './types';

/**
 * 从 fetch 响应体中消费 SSE 流。
 * 逐事件调用 onEvent，遇到 DONE 或流结束中止。
 */
export async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (data: string) => void,
  onDone: () => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 保留最后一段（可能不完整）
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') {
            onDone();
            return;
          }
          onEvent(payload);
        }
      }
    }
    // 处理残留 buffer
    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().slice(5).trim();
      if (payload && payload !== '[DONE]') onEvent(payload);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 将一段 SSE data payload 解析为流块。
 * @returns null 表示不是有效增量或结束标记
 */
export function streamChunkFromPayload(payload: string): AIStreamChunk | null {
  try {
    const json = JSON.parse(payload);
    const delta = json?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta) {
      return { content: delta, done: false };
    }
    // 某些实现用 message.content (非流式片段)
    const message = json?.choices?.[0]?.message?.content;
    if (typeof message === 'string' && message) {
      return { content: message, done: false };
    }
    if (json?.usage) {
      return {
        content: '',
        done: true,
        usage: {
          inputTokens: json.usage.prompt_tokens ?? 0,
          outputTokens: json.usage.completion_tokens ?? 0,
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}
