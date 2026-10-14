# note-demo — AI 智能笔记助手 · 运作手册

> 这份文档写给**零 APP 开发基础的新手**。读完你能清楚知道：这是什么项目、每一块代码在哪、数据库有哪些表、怎么在这基础上继续改。

---

## 1 · 这是什么（用一句话说）
一个装在手机上的笔记 APP。支持写文字、拍照、录音、收藏网页链接、建待办清单。最大的卖点是**可以让 AI 帮你分类笔记、帮你改文笔、帮你从笔记里聊天回答问题**。

## 2 · 技术骨架（哪些零件搭起来的）

| 零件 | 作用（大白话解释） |
|------|-------------------|
| React Native + Expo | 让你用写网页的技术（JavaScript）写出手机 App。Expo 负责管原生部分（拍照/录音/通知这种需要手机的硬件） |
| expo-router | 页面的"导航"，就像网站超链接，点一下跳到一个新页面 |
| Zustand | 存临时状态（比如"当前显示哪些笔记"），关了 App 就消失 |
| expo-sqlite | 专门存数据的数据库，永久保存（你的笔记、待办都在里面） |
| expo-secure-store | 比普通存储更安全，专门存敏感数据（比如 AI 的密钥） |
| react-native-pell-rich-editor | 让笔记里的文字可以加粗/变色/插图片的"富文本编辑器"——相当于手机上的 Word |

## 3 · 文件目录（只有重要的）

### 3.1 应用页面（`app/`）
所有你能在 App 里看到的页面。一共 25 个。

| 页面/文件 | 你看到的就是 |
|-----------|-------------|
| `_layout.tsx` | **骨架**：包裹所有页面的背景、数据库启动、主题、Toast、创作浮层 |
| `index.tsx` | **引导判断**：第一次打开？去引导页。不是第一次？直接首页 |
| `tabs/_layout.tsx` | **底部那排导航栏**（手帖/问墨/待办/设置/中间的+号） |
| `tabs/index.tsx` | **手帖（笔记首页）**：三种视图（列表/日历/图库）切换 |
| `tabs/ai-chat.tsx` | **问墨（AI 对话页）**：和 AI 聊天、问纸间问题、引用笔记回答 |
| `tabs/todos.tsx` | **待办列表页**：今天/近7天/收集箱三档切换 |
| `tabs/settings.tsx` | **设置页**：主题切换、导出/导入数据、AI 配置入口 |
| `note/[id].tsx` | **笔记详情页**：点开某篇笔记看到的内容（全文/附件/链接卡片） |
| `note/[id]/edit.tsx` | **笔记编辑页**：写笔记的地方（富文本、插图片、AI 润色） |
| `note/edit.tsx` | 新建笔记的"快捷入口"，实际跳转到上面那个编辑页 |
| `todo/[id].tsx` | **待办详情/编辑**：新建/编辑单条待办、设提醒时间 |
| `search.tsx` | **搜索页**：搜全文、按标签搜、或让 AI 语义搜 |
| `category/[id].tsx` | **分类管理**：新建/编辑/删除分类 |
| `folder/[id].tsx` | **文件夹详情**：查看某个文件夹下的笔记 |
| `folders.tsx` | **文件夹列表管理**：创建/重命名/删除文件夹 |
| `favorites.tsx` | **收藏夹**：显示所有点了收藏的笔记 |
| `trash.tsx` | **回收站**：恢复或彻底删除笔记 |
| `saved-links.tsx` | **链接库**：保存过的所有网页链接 |
| `link/[id].tsx` | **链接编辑**：新建/编辑链接、加标签 |
| `attachment/[id].tsx` | **附件预览**：打开笔记里的图片/PDF/音频 |
| `voice-record.tsx` | **录音页**：录制语音、存为笔记附件 |
| `ai-settings.tsx` | **AI 设置**：输通义千问/DeepSeek 的 API Key |
| `pending-classification.tsx` | **AI 分类待确认**：AI 帮分类了但你还未确认的笔记列表 |
| `onboarding.tsx` | **新手引导**：第一次打开看 4 页介绍 |

### 3.2 后台服务（`services/`）
页面点击后真正干活的部分。每个文件管理一类数据。

| 文件 | 管什么 |
|------|--------|
| `note.service.ts` | **笔记数据的增删改查**（创建/更新/删除/搜索/收藏） |
| `todo.service.ts` | **待办的增删改查**（完成/取消/按日期筛选/提醒） |
| `category.service.ts` | **分类的增删改查** |
| `tag.service.ts` | **标签的增删改查**（笔记可以挂多个标签） |
| `folder.service.ts` | **文件夹的增删改查** |
| `attachment.service.ts` | **附件的增删改查**（图片/录音/文件） |
| `savedLink.service.ts` | **链接库增删改查**（网页链接存档+标签） |
| `search.service.ts` | **搜索功能**（模糊搜笔记标题/正文/待办） |
| `import.service.ts` | **Markdown 导入**（把 .md 文件变成笔记） |
| `voice.service.ts` | **录音功能**（开始/停止/保存录音文件） |
| `notification.service.ts` | **系统通知**（到点提醒你该做某条待办） |
| `linkMeta.service.ts` | **链接预览**（点一个网址自动抓标题和缩略图） |
| `screenCapture.service.ts` | **全局截屏存档**（调本地原生模块抓一帧画面 → 存为敏感图片笔记） |
| `db/database.ts` | **数据库的底子**（建库、迁移、所有读写都要走这里） |
| `db/schema.ts` | **数据库表结构**（每一张表、每一列的定义） |
| `ai/autoClassify.ts` | 记完笔记后台自动调 AI 帮忙分到某个分类+打标签 |
| `ai/aiSearch.ts` | 语义搜索：读你的笔记后用 AI 回答你的问题 |
| `ai/rag.ts` | RAG 检索：从你的笔记里找出和问题最相关的几段 |
| `ai/conversation.service.ts` | AI 对话记录的存/读/删 |
| `ai/qwen.client.ts` | 调「通义千问」的接口 |
| `ai/deepseek.client.ts` | 调「DeepSeek」的接口 |
| `ai/sse.ts` | 处理流式应答（AI 一个字一个字往外蹦） |
| `ai/keyStore.ts` | **API Key 安全存储**（密钥存在手机的安全区内，不是明文） |
| `ai/index.ts` | AI 服务的统一出入口（前面各种 AI 功能都从这里叫） |
| `ai/types.ts` | AI 功能的类型定义 |

### 3.3 临时状态（`stores/`）
页面临时存的数据，关了 App 就没了。

| 文件 | 管什么 |
|------|--------|
| `noteStore.ts` | 当前笔记列表、文件夹、分类、标签在内存里的状态 |
| `todoStore.ts` | 当前待办列表的状态 |
| `aiStore.ts` | AI 对话的状态（当前和 AI 聊天的消息列表、正在流式输出） |
| `settingsStore.ts` | 设置项的持久化读写（主题/自动分类/是否完成了引导） |

### 3.4 页面组件（`src/components/`）
页面里拆出来的各种"零件"——能复用的 UI 块。

- **`common/`** — 万能零件：按钮、标签、空态、错误提示、极光背景、自适应图片、图标、按压反馈、Toast 气泡
- **`editor/`** — 写笔记的零件：富文本编辑器、加粗/变色/插图片的工具栏、保存状态
- **`note/`** — 笔记页面的零件：卡片、列表、筛选栏、视图切换、日历视图、图库瀑布流、附件列表、链接卡片、分享面板
- **`todo/`** — 待办页面的零件：待办列表、单条待办、进度环、笔记页内嵌的待办区
- **`ai/`** — AI 对话的零件：消息气泡、AI 操作条
- **`gallery/`** — 图库页面的零件：分区、卡片、筛选按钮
- **`calendar/`** — 日历的零件：月网格、月导航、日卷轴
- **`settings/`** — 设置页的零件：主题切换、分组标题、卡片行、开关、进度条、存储卡
- **`create/`** — 「记一笔」创作浮层（底部上拉的半屏写字区）

### 3.5 其他杂物（`src/constants/`、`src/theme/`、`src/hooks/`、`src/utils/`、`src/context/`）
| 位置 | 作用 |
|------|------|
| `constants/theme.ts` | 所有数据结构的类型定义（一条笔记长啥样、一条待办长啥样） |
| `constants/colors.ts` | 双主题颜色（日间水墨/夜间极光） |
| `constants/layout.ts` | 间距/圆角/字号/字重等布局规范 |
| `theme/ThemeContext.tsx` | 主题切换的上下文（持持久化了） |
| `hooks/useVoiceRecorder.ts` | 录音控制 |
| `hooks/useReducedMotion.ts` | 读取系统"无障碍-减少动效"开关 |
| `hooks/useSafeArea.ts` | 读取刘海/底部安全区 |
| `hooks/useAsyncData.ts` | 异步数据 loading/error 通用处理 |
| `utils/uuid.ts` | 生成唯一 ID |
| `utils/date.ts` | 格式化日期/时间 |
| `utils/html.ts` | HTML 处理：提纯文本、安全清洗（防恶意脚本）、识别链接 |
| `utils/mediaCards.ts` | 生成"多媒体卡片"HTML（图片卡/链接卡/录音卡） |
| `utils/attachmentStorage.ts` | 附件文件存到手机本地 |
| `animations/index.ts` | 动效：卡片入场、声波律动、印章脉冲、光环扩散 |
| `context/PlusSheetContext.tsx` | 全局创作浮层开关 |
| `context/ToastContext.tsx` | 全局气泡提示开关 |

### 3.6 本地原生模块（`modules/`）与原生入口（`android/`）
> 前台 JS 调不到的手机硬件能力（全局截屏、分享接收、快速设置磁贴），由这层 Kotlin 原生代码提供。

| 位置 | 作用 |
|------|------|
| `modules/screen-capture/` | **全局截屏**本地 Expo 模块（`MediaProjection` 抓一帧 PNG）。由 `expo-modules-autolinking` 自动发现，无需手改 gradle |
| `plugins/withNoteDemoNative.js` | **config plugin**：托管 `MainActivity.kt` / `NoteCaptureTileService.kt` / 磁贴图标 / tile_label / Manifest 注入，让 `expo prebuild` 每次自动重建这些原生改动 |
| `android/.../MainActivity.kt` | 收「分享到 note-demo」的 SEND 意图，抽取 URL/标题转成深链（**由 plugin 生成，勿手改**） |
| `android/.../NoteCaptureTileService.kt` | 快速设置磁贴，点击发 `note-demo://capture?token=...` 深链唤起截屏（**由 plugin 生成，勿手改**） |
| `android/.../res/drawable/ic_tile_capture.xml` | 磁贴单色图标（**由 plugin 生成**） |

> 注意：
> 1. **`expo prebuild` 会清空重建 `android/` 目录**，`android/` 下的手工改动会丢失。原生改动务必改在 `plugins/withNoteDemoNative.js`（改后重新 `prebuild`），或改 `modules/`（不受 prebuild 影响）。
> 2. 磁贴的 `CAPTURE_TOKEN` 常量同时存在于 `plugins/withNoteDemoNative.js`（生成 Kotlin 侧）和 `app/_layout.tsx`（JS 侧），**改动需同步这两处**（详见 `docs/13` 第 9.2 节）。
> 3. `android/mirror.gradle`（阿里云镜像编译脚本）不在托管范围，每次 prebuild 后需重建。

---

## 4 · 数据库说明书（最重要的那一张图纸）

### 4.1 基本参数
| 项 | 值 |
|----|-----|
| 文件 | `note.db`（放手机应用自己的数据目录里） |
| 版本 | **v8**（通过 `PRAGMA user_version` 标记，升级时自动跑对应迁移脚本） |
| 模式 | WAL（提升性能） |
| 并发控制 | **所有数据库操作排成一队，一个接一个来**——避免同时运行多条语句时 Android 底层崩溃 |

### 4.2 活表一览（真正被代码读写、存着你数据的表）

#### 📝 `notes` 笔记表
存每一篇笔记（标题、富文本 HTML 正文、纯文本正文、所属分类、AI 生成的摘要和标签、收藏标记、是否敏感、是否已确认 AI 分类、软删除——回收站里恢复用的）。共 8 个索引。

#### 📁 `folders` 文件夹表
文件夹可以嵌套。有个 `note_count` 字段存"这个文件夹里几篇笔记"（现在直接从笔记表实时算的，更准）。2 个索引。

#### 🏷️ `categories` 分类表
内置 6 个系统分类：工作(cat_work)、学习(cat_study)、生活(cat_life)、想法(cat_idea)、待办(cat_todo)、财务(cat_finance)。slug 列唯一。

#### 🔖 `tags` 标签表 + `note_tags` 关联表
笔记可以挂多个标签。`note_tags` 是多对多关联表（`note_id`→笔记、`tag_id`→标签），外键级联删除：删笔记自动删关联，删标签自动删关联。`usage_count` 记录每个标签用了多少次。

#### ✅ `todos` 待办表
标题/描述、状态(pending/completed)、优先级(1-3)、截止日期、提醒时间、关联的笔记（可为空）、可以有子任务（`parent_todo_id`）。6 个索引。

#### 💬 `ai_conversations` + `ai_messages` AI 对话表
会话存标题/使用的模型/消息数/Token 积累。消息存角色(user/assistant/system)、正文、引用的笔记 ID、内容类型。删会话时消息自动级联删除。

#### 🔗 `saved_links` 链接库表 + `link_tags` + `saved_link_tags` 关联表
保存的网页链接（URL/标题/描述/缩略图/已读状态/收藏）。v7 后统一用 `link_tags` 独立标签机制替代了旧的 `category` 文本字段。

#### 📎 `attachments` 附件表
笔记的图片/录音/文件（类型+本地路径+大小+MIME+图片尺寸/音频时长+OCR识别文本+AI图片描述）。3 个索引。删笔记时附件自动级联删除。

#### 🗺️ `note_versions` 笔记版本表
编辑历史记录（每次改了什么、改之前的内容、谁改的）。目前虽然有表但没有触发器，尚未被代码写入（空表投入）。

#### ⚙️ `user_preferences` 用户偏好表
存了 7 条默认设置：主题(light/dark)、AI 服务商(qwen/deepseek)、是否自动分类、是否语音自动转文字、是否启用 OCR 等。

### 4.3 死表（表结构在，但当前代码没有读写它们）
| 表名 | 用途 | 状态 |
|------|------|------|
| `sync_status` | 本是给"多台手机间同步"用的队列 | 同步功能尚未上线，表是空的预留壳 |
| `invoices` | 本是给"发票/票据 OCR 识别"用的 | OCR 功能尚未实现 |
| `voice_records` | 本是给"语音转写结果"用的 | 录音目前只存附件，转写(ASR)尚未接入 |

### 4.4 已删除的表
| 表名 | 版本 | 说明 |
|------|------|------|
| `notes_fts` | v2 建 → v8 删 | 原来是全文搜索的 FTS5 索引表，因在 Android 上触发原生崩溃，搜索改为普通 LIKE，这张表已无用，v8 自带 DROP |

### 4.5 迁移历史（v0→v8）
- **v0→v1**：首次建库（建全部表 + 预置分类和设置）
- **v1→v2**：创建 FTS5 全文搜索索引
- **v2→v3**：新增 `ai_classify_confirmed` 字段（AI 分类后会标记"待你确认"）
- **v3→v4**：删除 FTS 维护触发器（修复 Android 崩溃）
- **v4→v5**：再删一次触发器（兜底）
- **v5→v6**：移除「收藏」分类，收藏改为 `is_favorite` 这个 true/false 标记
- **v6→v7**：链接库的"分类"改成可增删的"标签"机制
- **v7→v8**：删除废弃的 `notes_fts` 表

---

## 5 · 你第一次想改项目时最可能用到的"黄金路径"

| 想做什么 | 先看哪个文件 | 再改哪个 |
|----------|------------|--------|
| 加新的笔记字段 | `constants/theme.ts` → 改 Note 类型 | `db/schema.ts` 加列 + 新迁移脚本 |
| 改编辑器按键/布局 | `editor/EditorToolbar.tsx` | `editor/RichTextEditor.tsx` |
| 改详情页的样子 | `note/[id].tsx` | `components/note/` 下的 DetailFooter / ShareSheet |
| 改 AI 交互 | `ai-kv.tsx` | `stores/aiStore.ts` → `services/ai/index.ts` |
| 新增一个独立页面 | `app/` 下新建文件 | `_layout.tsx` 注册路由 Stack.Screen |
| 加新的后台服务 | `services/` 下新建文件 | `services/index.ts` 导出 |

## 6 · 重要的安全规则（改代码时别碰红线）
1. 笔记正文存在 `content`（HTML）里，用富文本编辑器时会渲染。如果让用户往里面塞 `<script>` 就会产生漏洞。所以进编辑器前必须用 `sanitizeRichHtml` 洗一遍。
2. 敏感笔记（`is_sensitive=1` 的）永远不被发送给 AI、不在导出里面。这是隐私承诺，不要绕过。
3. 所有的数据库操作一定要通过 `getDB()` 来获取连接，不要自己新建，因为内部是一个排队的队列——自己新建会导致崩溃。
4. API Key 用 expo-secure-store 存在系统安全区，不要在代码的任何地方用 `console.log` 打出来。

## 7 · Git 提交历史（最近 4 笔）
```
ef57e01 config: Android 禁用自动备份，防明文 DB 随备份离开设备
23c78cd fix: 对抗性安全加固（XSS/敏感导出/SSRF/密钥）
69ea69e fix: 审查修复 + 性能/无障碍/一致性
1f138df feat: 初始化 note-demo AI 笔记助手
```
