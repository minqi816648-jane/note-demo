// ============================================
// 语音记录持久化服务
// 管理 voice_records 表
// ============================================

import { getDB } from './db/database';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';
import type { Attachment } from '../src/constants/theme';

export interface VoiceRecord {
  id: string;
  note_id: string;
  attachment_id: string;
  duration: number;
  transcript_text: string | null;
  transcript_status: 'processing' | 'done' | 'error';
  speaker_count: number;
  speakers: string | null;
  summary: string | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

export class VoiceRecordService {
  /** 创建录音记录 */
  static async createRecord(data: Partial<VoiceRecord>): Promise<VoiceRecord> {
    const db = await getDB();
    const id = data.id || generateUUID();
    const now = nowISO();

    const record: VoiceRecord = {
      id,
      note_id: data.note_id ?? '',
      attachment_id: data.attachment_id ?? '',
      duration: data.duration ?? 0,
      transcript_text: data.transcript_text ?? null,
      transcript_status: data.transcript_status ?? 'processing',
      speaker_count: data.speaker_count ?? 1,
      speakers: data.speakers ?? null,
      summary: data.summary ?? null,
      is_pinned: data.is_pinned ?? 0,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO voice_records (
        id, note_id, attachment_id, duration, transcript_text, transcript_status,
        speaker_count, speakers, summary, is_pinned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, record.note_id, record.attachment_id, record.duration,
        record.transcript_text, record.transcript_status, record.speaker_count,
        record.speakers, record.summary, record.is_pinned, record.created_at, record.updated_at,
      ]
    );
    return record;
  }

  /** 更新转写状态 */
  static async updateTranscript(id: string, data: {
    transcript_text?: string;
    transcript_status?: VoiceRecord['transcript_status'];
    summary?: string | null;
  }): Promise<void> {
    const db = await getDB();
    const sets: string[] = ['updated_at = ?'];
    const values: any[] = [nowISO()];
    if (data.transcript_text !== undefined) {
      sets.push('transcript_text = ?');
      values.push(data.transcript_text);
    }
    if (data.transcript_status !== undefined) {
      sets.push('transcript_status = ?');
      values.push(data.transcript_status);
    }
    if (data.summary !== undefined) {
      sets.push('summary = ?');
      values.push(data.summary);
    }
    values.push(id);
    await db.runAsync(`UPDATE voice_records SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  /** 获取笔记的语音记录 */
  static async getRecordsByNote(noteId: string): Promise<VoiceRecord[]> {
    const db = await getDB();
    return await db.getAllAsync<VoiceRecord>(
      'SELECT * FROM voice_records WHERE note_id = ? ORDER BY created_at DESC',
      [noteId]
    );
  }

  /** 删除录音记录 */
  static async deleteRecord(id: string, hard = false): Promise<void> {
    const db = await getDB();
    if (hard) {
      await db.runAsync('DELETE FROM voice_records WHERE id = ?', [id]);
      return;
    }
    await db.runAsync('DELETE FROM voice_records WHERE id = ?', [id]);
  }
}
