# note-demo API 接口设计文档

## 1. 概述

本文档定义 note-demo 应用的 API 接口规范，包括：

1. **客户端本地服务接口** - App 内部模块之间的服务调用接口
2. **AI 服务接口** - 与各种 AI 提供商的交互协议
3. **后端云同步 API** - 与自建后端的 RESTful API
4. **第三方程分享/系统集成接口** - 与系统和其他应用的交互

### 1.1 整体架构

```
┌───────────────────────────────────────────────────────────────────┐
│                      客户端内部服务层                               │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ 笔记服务        │  │ AI 服务         │  │ 搜索服务        │  │
│  │ NoteService     │  │ AIService       │  │ SearchService   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ 待办服务        │  │ 同步服务        │  │ 存储服务        │  │
│  │ TodoService     │  │ SyncService     │  │ StorageService  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                          │                       │
              ┌───────────┴───────────┐   ┌───────┴────────┐
              ▼                     ▼   ▼               ▼
┌────────────────────┐    ┌──────────────────┐  ┌─────────────────┐
│    AI 服务提供商    │    │  自建后端        │  │ 系统集成        │
│                     │    │  (云同步 API)    │  │ (分享/语音/OCR) │
└────────────────────┘    └──────────────────┘  └─────────────────┘
```

### 1.2 API 设计原则

1. **RESTful**：使用标准 HTTP 方法（GET/POST/PUT/DELETE）
2. **JSON 格式**：请求和响应统一使用 JSON
3. **错误码规范**：统一错误码结构
4. **版本控制**：API 路径携带版本号 (/api/v1/)
5. **认证安全**：JWT + 设备指纹认证
6. **幂等性**：关键写操作支持幂等重试
7. **分页**：列表接口统一分页参数

---

## 2. 客户端本地服务接口

### 2.1 笔记服务接口 (NoteService)

```typescript
// NoteService 接口定义

interface NoteService {
    /**
     * 创建笔记
     * @param data - 笔记数据
     * @returns 创建的笔记
     */
    createNote(data: CreateNoteInput): Promise<Note>;

    /**
     * 获取笔记详情
     * @param id - 笔记 ID
     * @returns 笔记详情
     */
    getNote(id: string): Promise<NoteDetail>;

    /**
     * 更新笔记
     * @param id - 笔记 ID
     * @param data - 更新数据
     */
    updateNote(id: string, data: UpdateNoteInput): Promise<void>;

    /**
     * 软删除笔记
     * @param id - 笔记 ID
     */
    deleteNote(id: string): Promise<void>;

    /**
     * 恢复已删除笔记
     * @param id - 笔记 ID
     */
    restoreNote(id: string): Promise<void>;

    /**
     * 获取笔记列表
     * @param query - 查询条件
     * @returns 笔记列表
     */
    getNotes(query: NoteQuery): Promise<PaginatedResult<Note>>;

    /**
     * 切换收藏状态
     * @param id - 笔记 ID
     */
    toggleFavorite(id: string): Promise<void>;

    /**
     * 归档笔记
     * @param id - 笔记 ID
     */
    archiveNote(id: string): Promise<void>;

    /**
     * 获取版本历史
     * @param noteId - 笔记 ID
     * @returns 版本列表
     */
    getVersions(noteId: string): Promise<NoteVersion[]>;

    /**
     * 回滚到指定版本
     * @param noteId - 笔记 ID
     * @param versionId - 版本 ID
     */
    rollbackVersion(noteId: string, versionId: string): Promise<void>;

    /**
     * 获取回收站列表
     */
    getTrash(): Promise<PaginatedResult<Note>>;

    /**
     * 彻底删除（清空回收站）
     */
    permanentlyDelete(id: string): Promise<void>;
}

// 参数类型定义
interface CreateNoteInput {
    title?: string;
    content?: string;              // 富文本 JSON
    content_text?: string;         // 纯文本
    parent_id?: string | null;     // 文件夹 ID
    category_id?: string;          // 分类 ID
    tags?: string[];               // 标签名称数组
    is_sensitive?: boolean;        // 是否敏感
    attachments?: AttachmentInput[];
}

interface UpdateNoteInput extends Partial<CreateNoteInput> {
    ai_summary?: string;
    ai_tags?: string[];
}

interface NoteQuery {
    folder_id?: string;            // 按文件夹过滤
    category_id?: string;          // 按分类过滤
    tag?: string;                  // 按标签过滤
    keyword?: string;              // 关键词搜索
    is_favorite?: boolean;
    is_archived?: boolean;
    sort_by?: 'created' | 'updated' | 'title';
    sort_order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
}
```

### 2.2 待办服务接口 (TodoService)

```typescript
interface TodoService {
    createTodo(data: CreateTodoInput): Promise<TodoItem>;
    getTodos(query: TodoQuery): Promise<PaginatedResult<TodoItem>>;
    updateTodo(id: string, data: Partial<TodoItem>): Promise<void>;
    completeTodo(id: string): Promise<void>;
    uncompleteTodo(id: string): Promise<void>;
    deleteTodo(id: string): Promise<void>;
    attachNote(todoId: string, noteId: string): Promise<void>;
    detachNote(todoId: string): Promise<void>;
    setReminder(todoId: string, remindAt: string): Promise<void>;
    getTodayTodos(): Promise<TodoItem[]>;
}

interface CreateTodoInput {
    title: string;
    description?: string;
    note_id?: string;
    due_date?: string;
    priority?: 1 | 2 | 3;
    remind_at?: string;
    parent_todo_id?: string;
    source?: 'manual' | 'ai_extract' | 'voice';
}

interface TodoQuery {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    view?: 'today' | 'upcoming' | 'all';
    priority?: 1 | 2 | 3;
    keyword?: string;
    page?: number;
    page_size?: number;
}
```

### 2.3 AI 服务接口 (AIService)

```typescript
interface AIService {
    /**
     * 发送消息到 AI 对话
     * @param conversationId - 对话 ID
     * @param content - 用户消息内容
     * @returns 流式响应
     */
    sendMessage(conversationId: string, content: string): AsyncGenerator<AIChunk>;

    /**
     * 创建新对话
     */
    createConversation(title?: string): Promise<Conversation>;

    /**
     * 获取对话列表
     */
    getConversations(): Promise<Conversation[]>;

    /**
     * 获取对话消息历史
     */
    getMessages(conversationId: string): Promise<ChatMessage[]>;

    /**
     * 删除对话
     */
    deleteConversation(id: string): Promise<void>;

    /**
     * AI 分类笔记
     * @param content - 笔记内容
     */
    classifyNote(content: string): Promise<ClassificationResult>;

    /**
     * 提取待办事项
     * @param text - 文本内容
     */
    extractTodos(text: string): Promise<ExtractedTodo[]>;

    /**
     * 翻译文本
     */
    translate(text: string, targetLang: string): Promise<string>;

    /**
     * 摘要文本
     */
    summarize(text: string, maxLength?: number): Promise<string>;

    /**
     * 润色文本
     */
    polish(text: string): Promise<string>;

    /**
     * 分析图片内容
     */
    analyzeImage(imageUri: string, prompt?: string): Promise<string>;

    /**
     * OCR 识别
     */
    ocrImage(imageUri: string): Promise<OCRResult>;

    /**
     * 语音转文字
     */
    speechToText(audioUri: string, language?: string): Promise<AsyncGenerator<ASRChunk>>;

    /**
     * 语音指令解析
     */
    parseVoiceCommand(text: string): Promise<VoiceCommand>;
}

// 类型定义
interface ClassificationResult {
    category_id: string;
    tags: string[];
    summary: string;
    is_todo: boolean;
    extracted_links: LinkInfo[];
    keywords: string[];
}

interface ExtractedTodo {
    title: string;
    dueDate?: string;
    priority?: 1 | 2 | 3;
    note?: string;
}

interface VoiceCommand {
    intent: 'create_todo' | 'search_note' | 'create_note' | 'list_todos' | 'unknown';
    params: Record<string, any>;
    originalText: string;
}

interface LinkInfo {
    url: string;
    type: 'website' | 'github' | 'shopping' | 'cloud';
    title?: string;
}

interface AIChunk {
    type: 'text' | 'tool_use' | 'thinking' | 'done';
    content: string;
    metadata?: Record<string, any>;
}
```

### 2.4 搜索服务接口 (SearchService)

```typescript
interface SearchService {
    /**
     * 综合搜索
     * @param query - 搜索关键词
     * @param options - 搜索选项
     */
    search(query: string, options?: SearchOptions): Promise<SearchResults>;

    /**
     * 语义搜索（仅在线）
     */
    semanticSearch(query: string, limit?: number): Promise<SearchResult[]>;

    /**
     * OCR 搜索（图片文字）
     */
    ocrSearch(query: string): Promise<SearchResult[]>;

    /**
     * 搜索建议（联想）
     */
    getSuggestions(keyword: string): Promise<string[]>;

    /**
     * 重建搜索索引
     */
    rebuildIndex(): Promise<void>;
}

interface SearchOptions {
    search_type?: 'all' | 'note' | 'todo' | 'link' | 'image';
    folder_id?: string;
    category_id?: string;
    tag?: string;
    date_from?: string;
    date_to?: string;
    include_sensitive?: boolean;  // 默认 false
    sort_by?: 'relevance' | 'date' | 'title';
    page?: number;
    page_size?: number;
}

interface SearchResults {
    total: number;
    items: SearchResult[];
    page: number;
    page_size: number;
    search_facets?: {
        categories: { id: string; name: string; count: number }[];
        types: { type: string; count: number }[];
    };
}

interface SearchResult {
    id: string;
    type: 'note' | 'todo' | 'link' | 'attachment';
    title: string;
    snippet: string;
    highlight: string;
    relevance_score: number;
    note_id?: string;
    created_at: string;
    updated_at: string;
}
```

### 2.5 存储服务接口 (StorageService)

```typescript
interface StorageService {
    /**
     * 保存附件文件
     * @param sourceUri - 源文件 URI
     * @param noteId - 所属笔记 ID
     * @param type - 文件类型
     */
    saveAttachment(sourceUri: string, noteId: string, type: AttachmentType): Promise<Attachment>;

    /**
     * 保存图片（自动压缩+缩略图）
     */
    saveImage(uri: string, noteId: string, options?: ImageOptions): Promise<Attachment>;

    /**
     * 保存音频文件
     */
    saveAudio(uri: string, noteId: string, duration: number): Promise<Attachment>;

    /**
     * 获取文件访问 URI
     */
    getFileUri(attachmentId: string): Promise<string>;

    /**
     * 删除附件
     */
    deleteAttachment(attachmentId: string): Promise<void>;

    /**
     * 生成缩略图
     */
    generateThumbnail(imageUri: string, size?: { width: number; height: number }): Promise<string>;

    /**
     * 获取存储使用量
     */
    getStorageUsage(): Promise<StorageUsage>;

    /**
     * 清理缓存文件
     */
    clearCache(): Promise<void>;
}

interface AttachmentType {
    type: 'image' | 'audio' | 'video' | 'file';
}

interface ImageOptions {
    compress?: boolean;
    maxWidth?: number;
    quality?: number;
}

interface StorageUsage {
    total_size: number;
    note_count: number;
    attachment_count: number;
    cache_size: number;
}
```

### 2.6 同步服务接口 (SyncService)

```typescript
interface SyncService {
    /**
     * 执行同步
     * @param options - 同步选项
     */
    sync(options?: SyncOptions): Promise<SyncResult>;

    /**
     * 获取同步状态
     */
    getSyncStatus(): Promise<SyncStatusInfo>;

    /**
     * 手动触发全量同步
     */
    forceFullSync(): Promise<SyncResult>;

    /**
     * 取消进行中的同步
     */
    cancelSync(): Promise<void>;

    /**
     * 注册同步监听
     */
    onSyncStatusChange(callback: (status: SyncStatusInfo) => void): void;
}

interface SyncOptions {
    type?: 'incremental' | 'full' | 'pull-only' | 'push-only';
    entities?: ('note' | 'todo' | 'link' | 'conversation')[];
}

interface SyncResult {
    success: boolean;
    pushed_count: number;
    pulled_count: number;
    conflicts: Conflict[];
    errors: SyncError[];
    started_at: string;
    completed_at: string;
}

interface SyncStatusInfo {
    status: 'idle' | 'syncing' | 'error' | 'offline';
    last_sync_at: string;
    pending_changes: number;
    progress?: { current: number; total: number };
}

interface Conflict {
    entity_type: string;
    entity_id: string;
    local_version: number;
    remote_version: number;
    resolution: 'local_win' | 'remote_win' | 'merge' | 'manual';
}

interface SyncError {
    entity_type: string;
    entity_id: string;
    error_code: string;
    error_message: string;
}
```

---
## 3. AI 服务提供商接口

### 3.1 通义千问 API (Qwen)

#### 3.1.1 对话补全接口

```http
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

Content-Type: application/json
Authorization: Bearer <DASHSCOPE_API_KEY>

{
  "model": "qwen-turbo",
  "input": {
    "messages": [
      {
        "role": "system",
        "content": "系统提示词"
      },
      {
        "role": "user",
        "content": "用户消息"
      }
    ]
  },
  "parameters": {
    "result_format": "message",
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.8,
    "enable_search": false,
    "incremental_output": true
  }
}
```


### 3.2 DeepSeek API

#### 3.2.1 对话补全接口

```http
POST https://api.deepseek.com/chat/completions

Content-Type: application/json
Authorization: Bearer <DEEPSEEK_API_KEY>

{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "系统提示词"
    },
    {
      "role": "user",
      "content": "用户消息"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true
}
```


---

### 3.3 百度 OCR API

#### 3.3.1 通用文字识别

```http
POST https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic

Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <BAIDU_ACCESS_TOKEN>

access_token=<ACCESS_TOKEN>
image=<BASE64_ENCODED_IMAGE>
```

**Response:**

```json
{
  "words_result": [
    {
      "words": "识别文字",
      "location": {
        "left": 10,
        "top": 20,
        "width": 100,
        "height": 30
      }
    }
  ],
  "words_result_num": 1,
  "log_id": 1234567890
}
```


---

### 3.4 讯飞语音 API

#### 3.4.1 实时语音转写 (WebSocket)

```
wss://iat-api.xfyun.cn/v2/iat

正证
Authorization: hmac username="<API_KEY>", algorithm="hmac-sha256", headers="host date request-line", signature=<SIGNATURE>

重本组接信式通式
// 开始幕(start message)
{
  "common": {
    "app_id": "<APP_ID>"
  },
  "business": {
    "language": "zh_cn",
    "domain": "iat",
    "accent": "mandarin"
  },
  "data": {
    "status": 0,
    "format": "audio/L16;rate=16000",
    "encoding": "raw",
    "audio": "<BASE64_AUDIO_CHUNK>"
  }
}
```


---

### 3.5 模型选择路由策略

```
请求进入 -> 检查功能类型
|-- 分类/打标签 -> qwen-turbo -> 失败 -> deepseek-chat
|-- 智能问答/聊天 -> qwen-turbo -> 失败 -> deepseek-chat
|-- 翻译 -> deepseek-chat -> 失败 -> qwen-turbo
|-- 摘要/润色 -> qwen-turbo -> 失败 -> kimi
|-- 图片理解 -> qwen-vl-plus -> 失败 -> glm-4v
|-- OCR -> 百度OCR -> 失败 -> 腾讯OCR
|-- 语音转文字 -> 讯飞 -> 失败 -> Google STT
\-- 语义向量化 -> BGE-M3 (本地) -> 失败 -> API方案

重试策略: 最多2次切换备选Provider
超时控制: 普通请求 30s，流式无限制
```


---

## 4. 后端云同步 API

### 4.1 通用约定

- Base URL: https://api.note-demo.com/api/v1
- 认证方式: JWT Bearer Token
- 请求头: Content-Type: application/json
- 所有时间字段: ISO 8601 格式
- 分页参数: page (从1开始) + page_size (默认20，最大100)

### 4.2 认证接口

#### 4.2.1 用户注册

```http
POST /auth/register

Request:
{
  "username": "user123",
  "email": "user@example.com",
  "password": "<hashed_password>"
}

Response 201:
{
  "user_id": "usr_xxx",
  "access_token": "<jwt_token>",
  "refresh_token": "<refresh_token>"
}
```


#### 4.2.2 用户登录

```http
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "<password>"
}

Response 200:
{
  "access_token": "<jwt_token>",
  "refresh_token": "<refresh_token>",
  "expires_in": 7200
}
```

#### 4.2.3 刷新令牌

```http
POST /auth/refresh

{
  "refresh_token": "<refresh_token>"
}
```


### 4.3 同步接口

#### 4.3.1 获取变更

```http
GET /sync/changes?since=<timestamp>&entity=note,todo,link

Response 200:
{
  "changes": [
    {
      "entity_type": "note",
      "entity_id": "note_001",
      "operation": "update",
      "data": {},
      "version": 5
    }
  ],
  "next_sync_token": "<cursor_token>"
}
```


#### 4.3.2 推送变更

```http
POST /sync/changes

Request:
{
  "changes": [
    {
      "entity_type": "note",
      "entity_id": "note_001",
      "operation": "update",
      "data": {
        "title": "新标题",
        "content": "<content_json>"
      },
      "version": 5
    }
  ],
  "client_device_id": "dev_001"
}

Response 200:
{
  "accepted": 1,
  "conflicts": [],
  "server_cursor": "<new_cursor>"
}
```


### 4.4 文件上传下载

#### 4.4.1 上传文件

```http
POST /files/upload

Content-Type: multipart/form-data

Form Data:
- file: <binary data>
- entity_type: note
- entity_id: note_001

Response 201:
{
  "file_id": "file_001",
  "url": "https://cdn.note-demo.com/files/file_001",
  "size": 1048576
}
```

#### 4.4.2 下载文件

```http
GET /files/<file_id>
-> 302 Redirect to CDN URL
```


### 4.5 设备管理

#### 4.5.1 注册设备

```http
POST /devices/register

{
  "device_type": "android",
  "device_name": "Xiaomi 14",
  "push_token": "<fcm_token>"
}
```

#### 4.5.2 注销设备

```http
DELETE /devices/<device_id>
```


---

## 5. 系统集成接口

### 5.1 系统分享接收

Android Intent Filters:

```xml
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/plain" />
    <data android:mimeType="image/*" />
    <data android:mimeType="application/pdf" />
</intent-filter>
```


### 5.2 保存向导流程

```
1. 用户在其他应用点击分享 -> 调起本应用的保存向导 Activity
2. 系统通过 Intent EXTRA 传递数据:
   - Intent.EXTRA_TEXT: 文本内容
   - Intent.EXTRA_STREAM: 文件 URI (图片/PDF等)
   - Intent.EXTRA_SUBJECT: 标题
3. 保存向导展示 -> 用户选择分类/文件夹/标签
4. 可选勾选: 识别链接、提取待办、AI分析
5. 点击保存 -> 调用 NoteService.createNote()
```

### 5.3 语音指令接口（可选）

```typescript
// 语音指令解析结果
interface VoiceCommandResult {
  intent: "create" | "search" | "todo" | "unknown";
  content?: string;          // 语音转文字结果
  params?: Record<string, any>;
}
```


---

## 6. 通用错误码规范

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | PARAM_ERROR | 参数错误 |
| 401 | UNAUTHORIZED | 未认证或 Token 过期 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 版本冲突 (同步冲突) |
| 413 | FILE_TOO_LARGE | 文件过大 |
| 429 | RATE_LIMITED | 请求频率超限 |
| 500 | SERVER_ERROR | 服务器内部错误 |
| 502 | BAD_GATEWAY | 上游服务错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

### 错误响应格式

```json
{
  "error": {
    "code": "PARAM_ERROR",
    "message": "参数错误：title 不能为空",
    "details": {},
    "request_id": "req_xxx"
  }
}
```


---

## 7. API Key 配置管理

### 7.1 支持的 Provider

| Provider | 配置项 | 必填 | 获取方式 |
|----------|--------|------|----------|
| 通义千问 | qwen_api_key | 是 | dashscope.aliyuncs.com |
| DeepSeek | deepseek_api_key | 否 | platform.deepseek.com |
| 百度OCR | baidu_api_key/secret | 否 | console.bce.baidu.com |
| 讯飞语音 | iflytek_app_id/api_key | 否 | xfyun.cn |
| 智谱GLM | glm_api_key | 否 | open.bigmodel.cn |
| Kimi | kimi_api_key | 否 | platform.moonshot.cn |

### 7.2 配置校验规则

1. API Key 使用系统安全存储 (Keystore)
2. 每次调用前校验 Key 有效性
3. 提供快速测试连接功能
4. 默认使用通义千问，无需额外配置
5. 用户可以随时切换 Provider

---

### 7.3 补充说明

- 所有 API 调用通过统一 AIService 层封装
- 请求超时: 普通请求 30s，流式对话无超时限制
- 重试策略: 最多 3 次指数退避重试
- 本地失败时自动降级到备选 Provider

---

*文档版本：v1.0*
*状态：已完成*
