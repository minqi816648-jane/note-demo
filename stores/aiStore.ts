import { create } from 'zustand';
import type { AIConversation, AIMessage, AIMessageRole } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';
import {
  AIConversationService,
  getSmartClient,
} from '../services';
import type { AIProviderName, AIMessageInput } from '../services/ai';
import { retrieveNotes, buildRagContext } from '../services/ai/rag';
import { useSettingsStore } from './settingsStore';

interface AIState {
  // 状态
  conversations: AIConversation[];
  currentConversationId: string | null;
  messages: AIMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  // 当前生效的 Provider（用于展示）
  activeProvider: AIProviderName | null;
  // 是否未配置 API Key
  noApiKey: boolean;

  // 操作
  fetchConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<AIConversation>;
  deleteConversation: (id: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  // 初始状态
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  isLoading: false,
  error: null,
  activeProvider: null,
  noApiKey: false,

  // ========== 操作 ==========

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await AIConversationService.getActiveConversations();
      set({ conversations, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createConversation: async (title) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await AIConversationService.createConversation(title);
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        messages: [],
        isLoading: false,
      }));
      return conversation;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await AIConversationService.deleteConversation(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversationId:
          state.currentConversationId === id ? null : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCurrentConversation: async (id) => {
    set({ currentConversationId: id, isLoading: true, error: null });
    try {
      if (!id) {
        set({ messages: [], isLoading: false });
        return;
      }
      const messages = await AIConversationService.getMessages(id);
      set({ messages, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  sendMessage: async (content) => {
    const { currentConversationId, isStreaming } = get();
    if (isStreaming) return;
    if (!content.trim()) return;

    // 确认已配置 API Key
    const smart = await getSmartClient(useSettingsStore.getState().aiProvider);
    if (!smart) {
      set({
        noApiKey: true,
        error: '尚未配置 AI API Key，请先在设置中配置。',
        isStreaming: false,
      });
      return;
    }

    // 如果没有当前对话，先创建一个
    let conversationId = currentConversationId;
    if (!conversationId) {
      const conversation = await get().createConversation();
      conversationId = conversation.id;
    }

    const now = nowISO();
    const userMessage: AIMessage = {
      id: generateUUID(),
      conversation_id: conversationId,
      role: 'user',
      content,
      content_type: 'text',
      attachments: null,
      referenced_notes: null,
      token_count: 0,
      is_sensitive: 0,
      created_at: now,
    };

    // 添加用户消息并持久化
    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      error: null,
      noApiKey: false,
      activeProvider: smart.provider,
    }));
    await AIConversationService.addMessage(userMessage);

    const assistantMessage: AIMessage = {
      id: generateUUID(),
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      content_type: 'markdown',
      attachments: null,
      referenced_notes: null,
      token_count: 0,
      is_sensitive: 0,
      created_at: nowISO(),
    };

    // 推送一个空的 assistant 消息，便于流式增量更新
    set((state) => ({
      messages: [...state.messages, { ...assistantMessage }],
    }));

    try {
      const history = await buildHistory(conversationId, content);

      const result = await smart.client.chatStream(history, (chunk) => {
        // 增量更新 assistant 消息
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + (chunk.content || '') }
              : m
          ),
        }));
      });

      const finalContent = result?.content ?? '';
      const usage = result?.usage;

      // 记录本次回答引用的来源笔记（RAG 检索到且用于上下文），供“查看原文/引用贴纸”跳转
      let referenced: { id: string; title: string }[] = [];
      try {
        const notes = await retrieveNotes(content, 5);
        referenced = notes.map((n) => ({ id: n.id, title: n.title || '无标题笔记' }));
      } catch {
        referenced = [];
      }

      // 用最终内容回填并持久化 assistant 消息
      const finalMessage: AIMessage = {
        ...assistantMessage,
        content: finalContent,
        referenced_notes: referenced.length > 0 ? JSON.stringify(referenced) : null,
        token_count: usage?.outputTokens ?? 0,
        created_at: nowISO(),
      };

      // 更新 store
      set((state) => ({
        messages: state.messages.map((m) => (m.id === assistantMessage.id ? finalMessage : m)),
        isStreaming: false,
      }));

      // 持久化 assistant 消息（仅当有内容）
      if (finalContent.trim()) {
        await AIConversationService.addMessage(finalMessage);
        await AIConversationService.updateConversationStats(conversationId, {
          tokenUsage: usage?.outputTokens ?? 0,
          modelUsed: smart.provider,
        });
      } else {
        // 空内容，从视图移除
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== assistantMessage.id),
          isStreaming: false,
        }));
      }

      // 刷新会话列表（标题可能已更新）
      get().fetchConversations();
    } catch (error) {
      set({
        error: (error as Error).message,
        isStreaming: false,
        messages: get().messages.map((m) =>
          m.id === assistantMessage.id ? { ...m, content: m.content + '\n\n[生成失败]' } : m
        ),
      });
    }
  },

  clearMessages: () => set({ messages: [] }),

  clearError: () => set({ error: null, noApiKey: false }),
}));

/**
 * 组装发送给模型的对话历史（取最近 N 条）
 * 通过 RAG 检索相关非敏感笔记作为上下文注入
 */
async function buildHistory(conversationId: string, lastQuery: string): Promise<AIMessageInput[]> {
  const messages = await AIConversationService.getMessages(conversationId);
  const trimmed = messages.slice(-20); // 控制上下文长度
  const history: AIMessageInput[] = trimmed.map((m) => ({
    role: (m.role as AIMessageRole) === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  // RAG：检索相关笔记并作为 system 上下文注入
  try {
    const notes = await retrieveNotes(lastQuery);
    const contextText = buildRagContext(notes, lastQuery);
    if (contextText) {
      const systemPrompt = currentSystemPrompt();
      history.unshift({
        role: 'system',
        content: `${systemPrompt}\n\n${contextText}`,
      });
    }
  } catch (error) {
    // RAG 失败不阻断对话，仅无上下文
    console.warn('RAG 检索失败:', error);
  }

  return history;
}

/**
 * 基础系统提示词
 */
function currentSystemPrompt(): string {
  return '你是 note-demo 的 AI 笔记助手。请用简洁、准确的中文回答问题，可参考提供的笔记上下文。';
}
