// ============================================
// 核心类型定义
// 参考《03-数据模型设计.md》
// ============================================

// ---------- 笔记 (Note) ----------
export interface Note {
  id: string;                          // UUID
  parent_id: string | null;            // 所属文件夹 ID，NULL 表示根目录
  title: string;                       // 笔记标题
  content: string;                     // 富文本内容 (JSON格式)
  content_text: string;                // 纯文本内容 (用于搜索)
  category_id: string | null;          // 所属分类 ID
  ai_summary: string | null;           // AI 生成摘要
  ai_tags: string | null;              // AI 生成标签 (JSON数组)
  is_sensitive: number;                // 是否敏感笔记 (0/1)
  is_favorite: number;                 // 是否收藏 (0/1)
  ai_classify_confirmed: number;       // AI 分类是否已确认 (0/1)，0=待确认
  content_hash: string | null;         // 内容哈希 (用于同步检测)
  device_id: string | null;            // 创建设备标识
  created_at: string;                  // 创建时间
  updated_at: string;                  // 最后更新时间
  deleted_at: string | null;           // 软删除时间
}

// ---------- 文件夹 (Folder) ----------
export interface Folder {
  id: string;                          // UUID
  parent_id: string | null;            // 父文件夹 ID，NULL 表示根级
  name: string;                        // 文件夹名称
  icon: string | null;                 // 文件夹图标
  color: string | null;                // 文件夹颜色 (HEX)
  sort_order: number;                  // 排序权重
  note_count: number;                  // 笔记数量 (冗余缓存)
  created_at: string;                  // 创建时间
  updated_at: string;                  // 更新时间
  deleted_at: string | null;           // 软删除时间
}

// ---------- 分类 (Category) ----------
export interface Category {
  id: string;                          // UUID
  name: string;                        // 分类名称
  slug: string;                        // 分类标识 (如: work, study, life)
  icon: string | null;                 // 分类图标
  color: string | null;                // 分类颜色 (HEX)
  is_system: number;                   // 是否系统预置 (0/1)
  sort_order: number;                  // 排序权重
  created_at: string;
  updated_at: string;
}

// ---------- 标签 (Tag) ----------
export interface Tag {
  id: string;                          // UUID
  name: string;                        // 标签名称
  color: string | null;                // 标签颜色
  usage_count: number;                 // 使用次数 (冗余统计)
  created_at: string;
  updated_at: string;
}

// ---------- 笔记-标签关联 (NoteTag) ----------
export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
}

// ---------- 链接标签 (LinkTag，独立注册表，类似 notes 的 tags) ----------
export interface LinkTag {
  id: string;
  name: string;
  color: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// ---------- 链接-标签关联 (SavedLinkTag) ----------
export interface SavedLinkTag {
  id: string;
  link_id: string;
  tag_id: string;
  created_at: string;
}

// ---------- 待办 (Todo) ----------
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TodoPriority = 1 | 2 | 3;
export type TodoSource = 'manual' | 'ai_extract' | 'voice';

export interface Todo {
  id: string;
  note_id: string | null;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  due_date: string | null;
  remind_at: string | null;
  completed_at: string | null;
  source: TodoSource;
  parent_todo_id: string | null;
  sort_order: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

// ---------- AI 对话 (AIConversation) ----------
export interface AIConversation {
  id: string;
  title: string;
  note_id: string | null;
  model_used: string | null;
  status: 'active' | 'archived' | 'deleted';
  message_count: number;
  token_usage: number;
  context_size: number;
  created_at: string;
  updated_at: string;
}

// ---------- AI 消息 (AIMessage) ----------
export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  content_type: 'text' | 'markdown' | 'code' | 'image';
  attachments: string | null;          // JSON数组
  referenced_notes: string | null;     // JSON数组
  token_count: number;
  is_sensitive: number;
  created_at: string;
}

// ---------- 附件 (Attachment) ----------
export type AttachmentType = 'image' | 'audio' | 'video' | 'file';

export interface Attachment {
  id: string;
  note_id: string;
  type: AttachmentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  thumbnail_path: string | null;
  ocr_text: string | null;
  ai_description: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ---------- 用户偏好 (UserPreference) ----------
export interface UserPreference {
  id: string;
  key: string;
  value: string | null;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  updated_at: string;
}

// ---------- 保存链接 (SavedLink) ----------
export interface SavedLink {
  id: string;
  note_id: string | null;
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  favicon_url: string | null;
  category: string | null;
  content_text: string | null;
  read_status: number;
  is_favorite: number;
  is_sensitive: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ---------- 枚举/工具类型 ----------
export type NoteFilter = {
  folderId?: string | null;
  categoryId?: string | null;
  tagId?: string | null;
  searchText?: string;
  isFavorite?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
};

