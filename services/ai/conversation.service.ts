// ============================================
// AI 对话持久化服务
// 管理 ai_conversations / ai_messages 表
// ============================================

import { getDB } from '../db/database';
import type { AIConversation, AIMessage } from '../../src/constants/theme';
import { generateUUID } from '../../src/utils/uuid';
import { nowISO } from '../../src/utils/date';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: 'text' | 'markdown' | 'code' | 'image';
  attachments: string | null;
  referenced_notes: string | null;
  token_count: number;
  is_sensitive: number;
  created_at: string;
}

export class AIConversationService {
  /** 获取对话列表（活跃） */
  static async getActiveConversations(): Promise<AIConversation[]> {
    const db = await getDB();
    return db.getAllAsync<AIConversation>(
      `SELECT * FROM ai_conversations
       WHERE status = 'active'
       ORDER BY updated_at DESC`
    );
  }

  /** 创建对话 */
  static async createConversation(title?: string): Promise<AIConversation> {
    const db = await getDB();
    const now = nowISO();
    const id = generateUUID();

    const conversation: AIConversation = {
      id,
      title: title || '新对话',
      note_id: null,
      model_used: null,
      status: 'active',
      message_count: 0,
      token_usage: 0,
      context_size: 0,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO ai_conversations (
        id, title, note_id, model_used, status, message_count,
        token_usage, context_size, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, conversation.title, null, null, 'active', 0, 0, 0,
        now, now,
      ]
    );

    return conversation;
  }

  /** 删除对话（逻辑删除） */
  static async deleteConversation(id: string, hard = false): Promise<void> {
    const db = await getDB();
    if (hard) {
      await db.runAsync('DELETE FROM ai_messages WHERE conversation_id = ?', [id]);
      await db.runAsync('DELETE FROM ai_conversations WHERE id = ?', [id]);
      return;
    }
    await db.runAsync(
      "UPDATE ai_conversations SET status = 'deleted', updated_at = ? WHERE id = ?",
      [nowISO(), id]
    );
  }

  /** 获取对话消息 */
  static async getMessages(conversationId: string): Promise<AIMessage[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<MessageRow>(
      `SELECT * FROM ai_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return rows.map(rowToMessage);
  }

  /** 新增消息 */
  static async addMessage(message: AIMessage): Promise<void> {
    const db = await getDB();

    const isUserMessage = message.role === 'user';

    await db.runAsync(
      `INSERT INTO ai_messages (
        id, conversation_id, role, content, content_type, attachments,
        referenced_notes, token_count, is_sensitive, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id, message.conversation_id, message.role, message.content,
        message.content_type, message.attachments, message.referenced_notes,
        message.token_count, message.is_sensitive, message.created_at,
      ]
    );

    // 更新会话消息数与时间戳
    await db.runAsync(
      `UPDATE ai_conversations
       SET message_count = message_count + 1,
           updated_at = ?
       WHERE id = ?`,
      [message.created_at, message.conversation_id]
    );

    if (isUserMessage) {
      await this.tryUpdateTitle(message);
    }
  }

  /** 更新会话统计数据 */
  static async updateConversationStats(
    id: string,
    stats: { tokenUsage?: number; contextSize?: number; modelUsed?: string }
  ): Promise<void> {
    const db = await getDB();
    const sets: string[] = ['updated_at = ?'];
    const values: any[] = [nowISO()];
    if (stats.tokenUsage !== undefined) {
      sets.push('token_usage = token_usage + ?');
      values.push(stats.tokenUsage);
    }
    if (stats.contextSize !== undefined) {
      sets.push('context_size = ?');
      values.push(stats.contextSize);
    }
    if (stats.modelUsed !== undefined) {
      sets.push('model_used = ?');
      values.push(stats.modelUsed);
    }
    values.push(id);
    await db.runAsync(`UPDATE ai_conversations SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  /** 若对话无有意义标题，用首条用户消息截断作为标题 */
  private static async tryUpdateTitle(message: AIMessage): Promise<void> {
    const db = await getDB();
    const title = message.content.replace(/\s+/g, ' ').trim();
    if (!title) return;

    const shortened = title.length > 24 ? `${title.slice(0, 24)}...` : title;
    await db.runAsync(
      `UPDATE ai_conversations
       SET title = CASE WHEN title = '新对话' THEN ? ELSE title END,
           updated_at = ?
       WHERE id = ?`,
      [shortened, message.created_at, message.conversation_id]
    );
  }
}

function rowToMessage(row: MessageRow): AIMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    role: row.role,
    content: row.content,
    content_type: row.content_type,
    attachments: row.attachments,
    referenced_notes: row.referenced_notes,
    token_count: row.token_count,
    is_sensitive: row.is_sensitive,
    created_at: row.created_at,
  };
}
