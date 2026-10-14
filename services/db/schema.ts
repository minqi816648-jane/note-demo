// ============================================
// 数据库表结构定义
// 参考《03-数据模型设计.md》
// ============================================

// 数据库版本
const DATABASE_VERSION = 8;

// 建表 SQL 语句
export const CREATE_TABLES_SQL = `
-- 笔记表
CREATE TABLE IF NOT EXISTS notes (
    id              TEXT PRIMARY KEY,
    parent_id       TEXT,
    title           TEXT NOT NULL DEFAULT '',
    content         TEXT DEFAULT '',
    content_text    TEXT DEFAULT '',
    category_id     TEXT,
    ai_summary      TEXT,
    ai_tags         TEXT,
    is_sensitive    INTEGER DEFAULT 0,
    is_favorite     INTEGER DEFAULT 0,
    is_archived     INTEGER DEFAULT 0, -- 归档已下线，此列保持以免破坏既有库；应用层不再读写
    ai_classify_confirmed INTEGER DEFAULT 1,
    content_hash    TEXT,
    device_id       TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    FOREIGN KEY (parent_id) REFERENCES folders(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 笔记表索引
CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_sensitive ON notes(is_sensitive);
CREATE INDEX IF NOT EXISTS idx_notes_ai_classify_confirmed ON notes(ai_classify_confirmed) WHERE ai_classify_confirmed = 0;

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id              TEXT PRIMARY KEY,
    parent_id       TEXT,
    name            TEXT NOT NULL,
    icon            TEXT,
    color           TEXT,
    sort_order      INTEGER DEFAULT 0,
    note_count      INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    FOREIGN KEY (parent_id) REFERENCES folders(id)
);

-- 文件夹表索引
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_deleted_at ON folders(deleted_at);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    icon            TEXT,
    color           TEXT,
    is_system       INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    color           TEXT,
    usage_count     INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- 笔记-标签关联表
CREATE TABLE IF NOT EXISTS note_tags (
    id              TEXT PRIMARY KEY,
    note_id         TEXT NOT NULL,
    tag_id          TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    UNIQUE(note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 笔记-标签关联表索引
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);

-- 笔记版本表
CREATE TABLE IF NOT EXISTS note_versions (
    id              TEXT PRIMARY KEY,
    note_id         TEXT NOT NULL,
    version         INTEGER NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT,
    content_text    TEXT,
    summary         TEXT,
    change_message  TEXT,
    change_type     TEXT,
    created_by      TEXT,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- 笔记版本表索引
CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id, version DESC);

-- 待办表
CREATE TABLE IF NOT EXISTS todos (
    id              TEXT PRIMARY KEY,
    note_id         TEXT,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT DEFAULT 'pending',
    priority        INTEGER DEFAULT 2,
    due_date        TEXT,
    remind_at       TEXT,
    completed_at    TEXT,
    source          TEXT DEFAULT 'manual',
    parent_todo_id  TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_deleted      INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_todo_id) REFERENCES todos(id)
);

-- 待办表索引
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_note_id ON todos(note_id);
CREATE INDEX IF NOT EXISTS idx_todos_remind_at ON todos(remind_at);
CREATE INDEX IF NOT EXISTS idx_todos_parent_todo_id ON todos(parent_todo_id);

-- AI 对话表
CREATE TABLE IF NOT EXISTS ai_conversations (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '新对话',
    note_id         TEXT,
    model_used      TEXT,
    status          TEXT DEFAULT 'active',
    message_count   INTEGER DEFAULT 0,
    token_usage     INTEGER DEFAULT 0,
    context_size    INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
);

-- AI 对话表索引
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON ai_conversations(status);

-- AI 消息表
CREATE TABLE IF NOT EXISTS ai_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    content_type    TEXT DEFAULT 'text',
    attachments     TEXT,
    referenced_notes TEXT,
    token_count     INTEGER DEFAULT 0,
    is_sensitive    INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- AI 消息表索引
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id, created_at);

-- 保存链接表
CREATE TABLE IF NOT EXISTS saved_links (
    id              TEXT PRIMARY KEY,
    note_id         TEXT,
    url             TEXT NOT NULL,
    title           TEXT,
    description     TEXT,
    thumbnail_url   TEXT,
    favicon_url     TEXT,
    category        TEXT,
    content_text    TEXT,
    read_status     INTEGER DEFAULT 0,
    is_favorite     INTEGER DEFAULT 0,
    is_sensitive    INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
);

-- 保存链接表索引
CREATE INDEX IF NOT EXISTS idx_saved_links_category ON saved_links(category);
CREATE INDEX IF NOT EXISTS idx_saved_links_created_at ON saved_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_links_read_status ON saved_links(read_status);

-- 链接标签表（独立注册表，类似 notes 的 tags）
CREATE TABLE IF NOT EXISTS link_tags (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    color           TEXT,
    usage_count     INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- 链接-标签关联表
CREATE TABLE IF NOT EXISTS saved_link_tags (
    id              TEXT PRIMARY KEY,
    link_id         TEXT NOT NULL,
    tag_id          TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    UNIQUE(link_id, tag_id),
    FOREIGN KEY (link_id) REFERENCES saved_links(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES link_tags(id) ON DELETE CASCADE
);

-- 链接标签索引
CREATE INDEX IF NOT EXISTS idx_saved_link_tags_link_id ON saved_link_tags(link_id);
CREATE INDEX IF NOT EXISTS idx_saved_link_tags_tag_id ON saved_link_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_usage ON link_tags(usage_count DESC);

-- 附件表
CREATE TABLE IF NOT EXISTS attachments (
    id              TEXT PRIMARY KEY,
    note_id         TEXT NOT NULL,
    type            TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    mime_type       TEXT,
    duration        INTEGER,
    width           INTEGER,
    height          INTEGER,
    thumbnail_path  TEXT,
    ocr_text        TEXT,
    ai_description  TEXT,
    title           TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- 附件表索引
CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(type);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

-- 同步状态表
CREATE TABLE IF NOT EXISTS sync_status (
    id              TEXT PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    operation       TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    sync_version    INTEGER DEFAULT 0,
    last_attempt_at TEXT,
    retry_count     INTEGER DEFAULT 0,
    error_message   TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE(entity_type, entity_id, operation)
);

-- 同步状态表索引
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status);
CREATE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status(entity_type, entity_id);

-- 用户偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
    id              TEXT PRIMARY KEY,
    key             TEXT NOT NULL UNIQUE,
    value           TEXT,
    value_type      TEXT DEFAULT 'string',
    description     TEXT,
    updated_at      TEXT NOT NULL
);

-- 票据识别表
CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    note_id         TEXT NOT NULL,
    attachment_id   TEXT,
    invoice_type    TEXT,
    merchant_name   TEXT,
    amount          REAL,
    currency        TEXT DEFAULT 'CNY',
    invoice_date    TEXT,
    items           TEXT,
    invoice_number  TEXT,
    payment_method  TEXT,
    tax_amount      REAL,
    status          TEXT DEFAULT 'unpaid',
    is_reimbursed   INTEGER DEFAULT 0,
    ocr_raw_data    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
);

-- 票据识别表索引
CREATE INDEX IF NOT EXISTS idx_invoices_note_id ON invoices(note_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON invoices(merchant_name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 语音记录表
CREATE TABLE IF NOT EXISTS voice_records (
    id              TEXT PRIMARY KEY,
    note_id         TEXT NOT NULL,
    attachment_id   TEXT NOT NULL,
    duration        INTEGER NOT NULL,
    transcript_text TEXT,
    transcript_status TEXT DEFAULT 'processing',
    speaker_count   INTEGER DEFAULT 1,
    speakers        TEXT,
    summary         TEXT,
    is_pinned       INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
);

-- 语音记录表索引
CREATE INDEX IF NOT EXISTS idx_voice_records_note_id ON voice_records(note_id);
CREATE INDEX IF NOT EXISTS idx_voice_records_status ON voice_records(transcript_status);

-- 注：历史存在 notes_fts FTS5 表；因 contentless FTS 在 Android 触发原生竞态、
-- 且搜索已统一改 LIKE，该表已废弃。新库不再创建，旧库由迁移 v8 幂等 DROP。
`;

// 迁移 v1 -> v2：创建 FTS 索引并回填已有笔记
export const MIGRATIONS_SQL: Record<number, string> = {
  2: `
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content_text,
        category_name,
        tag_names,
        content='',
        tokenize = 'unicode61'
    );
    INSERT INTO notes_fts (notes_fts, rowid, title, content_text, category_name, tag_names)
    SELECT 'rebuild', rowid, title, content_text, '', '' FROM notes;
  `,
  3: `
    ALTER TABLE notes ADD COLUMN ai_classify_confirmed INTEGER DEFAULT 1;
    CREATE INDEX IF NOT EXISTS idx_notes_ai_classify_confirmed
    ON notes(ai_classify_confirmed) WHERE ai_classify_confirmed = 0;
    -- 已有 AI 分类历史数据的笔记标记为待确认
    UPDATE notes SET ai_classify_confirmed = 0
    WHERE ai_tags IS NOT NULL AND ai_tags != '' AND ai_tags != '[]';
  `,
  4: `
    -- v4：移除 FTS 维护触发器（规避 expo-sqlite finalizeAsync 竞态）
    -- FTS 索引由各写入路径显式调用 syncFtsForNote() 维护。
    DROP TRIGGER IF EXISTS notes_au;
    DROP TRIGGER IF EXISTS notes_ai;
    DROP TRIGGER IF EXISTS notes_ad;
  `,
  5: `
    -- v5：兜底再次移除全部 FTS 触发器（覆盖曾只降 notes_au 的设备），幂等安全。
    DROP TRIGGER IF EXISTS notes_au;
    DROP TRIGGER IF EXISTS notes_ai;
    DROP TRIGGER IF EXISTS notes_ad;
  `,
  6: `
    -- v6：移除「收藏」系统分类（cat_fav），统一用 is_favorite flag 表达收藏。
    -- 将引用该分类的笔记回退为「无分类」，避免悬挂外键；幂等安全。
    UPDATE notes SET category_id = NULL WHERE category_id = 'cat_fav';
    DELETE FROM categories WHERE id = 'cat_fav' OR slug = 'fav';
  `,
  7: `
    -- v7：链接库「分类」改为可增删的标签机制（独立注册表 + 关联表）。
    CREATE TABLE IF NOT EXISTS link_tags (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL UNIQUE,
        color           TEXT,
        usage_count     INTEGER DEFAULT 0,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_link_tags (
        id              TEXT PRIMARY KEY,
        link_id         TEXT NOT NULL,
        tag_id          TEXT NOT NULL,
        created_at      TEXT NOT NULL,
        UNIQUE(link_id, tag_id),
        FOREIGN KEY (link_id) REFERENCES saved_links(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES link_tags(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_saved_link_tags_link_id ON saved_link_tags(link_id);
    CREATE INDEX IF NOT EXISTS idx_saved_link_tags_tag_id ON saved_link_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_link_tags_usage ON link_tags(usage_count DESC);
  `,
  8: `
    -- v8：移除废弃的 contentless FTS5 表（搜索已统一走 LIKE）。
    -- 该表在 Android 触发原生语句竞态、且存有不过期的 v2 快照，幂等 DROP 释放存储。
    DROP TABLE IF EXISTS notes_fts;
  `,
};

// 预置数据 SQL
export const SEED_DATA_SQL = `
-- 预置分类数据
INSERT OR IGNORE INTO categories (id, name, slug, icon, color, is_system, sort_order, created_at, updated_at) VALUES
    ('cat_work',    '工作', 'work',  '💼', '#4A90D9', 1, 1, datetime('now'), datetime('now')),
    ('cat_study',   '学习', 'study', '📚', '#50BFA5', 1, 2, datetime('now'), datetime('now')),
    ('cat_life',    '生活', 'life',  '🏠', '#F5A623', 1, 3, datetime('now'), datetime('now')),
    ('cat_idea',    '想法', 'idea',  '💡', '#B37FEB', 1, 4, datetime('now'), datetime('now')),
    ('cat_todo',    '待办', 'todo',  '✅', '#E54D2E', 1, 5, datetime('now'), datetime('now')),
    ('cat_finance', '财务', 'fin',   '💰', '#2E8B57', 1, 7, datetime('now'), datetime('now'));

-- 预置用户偏好
INSERT OR IGNORE INTO user_preferences (id, key, value, value_type, description, updated_at) VALUES
    ('pref_theme',          'theme',            'light',  'string', '主题: light/dark', datetime('now')),
    ('pref_ai_provider',    'ai_provider',      'qwen',   'string', 'AI服务商: qwen/deepseek', datetime('now')),
    ('pref_default_folder', 'default_folder',   '',       'string', '默认保存文件夹', datetime('now')),
    ('pref_auto_classify',  'auto_classify',    '1',      'number', '自动分类开关 (0/1)', datetime('now')),
    ('pref_voice_auto_txt', 'voice_auto_text',  '1',      'number', '语音自动转文字 (0/1)', datetime('now')),
    ('pref_share_default',  'share_default',    'note',   'string', '分享默认保存类型', datetime('now')),
    ('pref_ocr_enabled',    'ocr_enabled',      '1',      'number', 'OCR功能开关 (0/1)', datetime('now'));
`;

// 数据库版本
export const DB_VERSION = DATABASE_VERSION;
