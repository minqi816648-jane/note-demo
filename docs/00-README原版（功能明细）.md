# note-demo — AI 智能笔记助手

基于 React Native (Expo SDK 57) 的 AI 智能笔记助手移动应用。以「水墨为体 · 纸间为用 · 极光为夜」为设计理念，支持多模态记录（文字/拍照/语音/附件/链接/待办）与 AI 智能分类、问答。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 运行在 Android 上
npx expo start --android

# 运行在 iOS 上（或用 Expo Go 扫码）
npx expo start --ios
```

> 提示：语音录音基于 `expo-audio`（Expo Go 已内置原生模块），如需完整原生能力可改用开发构建：
> `npx expo run:android` / `npx expo run:ios`

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React Native 0.86 + Expo SDK 57 |
| 状态管理 | Zustand |
| 本地数据库 | SQLite (expo-sqlite，含 FTS/LIKE 搜索、WAL、迁移) |
| 导航 | expo-router（文件式路由 + 自定义底部 TabBar） |
| 富文本 | react-native-pell-rich-editor |
| 语音 | expo-audio（录音）；转写预留 ASR |
| AI | 通义千问 / DeepSeek（SSE 流式对话、RAG、自动分类/标签/摘要） |
| 动画 | RN 内置 Animated（自建动效模块 `src/animations`） |
| 图标 | react-native-svg（`NoteIcon`，统一线标图标） |
| UI 组件 | 自定义组件 + 双主题令牌 |

## 项目结构

```
├── app/                    # expo-router 路由
│   ├── _layout.tsx         # 根布局（数据库初始化、主题/浮层 Provider）
│   ├── index.tsx           # 根路由 → 重定向到 /tabs
│   ├── tabs/               # 底部标签页
│   │   ├── _layout.tsx     # 自定义 TabBar（四项 + 中央「+」记一笔）
│   │   ├── index.tsx       # 手帖（笔记列表：每日长卷/日历/图库）
│   │   ├── ai-chat.tsx     # 问墨（AI 对话）
│   │   ├── todos.tsx       # 待办
│   │   └── settings.tsx    # 设置
│   ├── note/               # 笔记 新建/详情/编辑
│   ├── todo/[id].tsx       # 待办 详情/新建/编辑
│   ├── link/[id].tsx       # 链接库 新增/编辑
│   ├── onboarding.tsx      # 引导页
│   ├── folder/[id].tsx     # 文件夹
│   ├── category/[id].tsx   # 分类 新建/编辑
│   ├── search.tsx          # 搜索
│   ├── favorites.tsx       # 收藏
│   ├── trash.tsx           # 回收站
│   ├── folders.tsx         # 文件夹管理
│   ├── saved-links.tsx     # 链接库
│   ├── voice-record.tsx    # 语音记录
│   ├── ai-settings.tsx     # AI 服务配置
│   └── pending-classification.tsx  # AI 分类待确认
├── services/               # 服务层
│   ├── db/                 # database.ts（初始化+串行化+迁移）、schema.ts
│   ├── note/folder/category/tag.service.ts
│   ├── attachment.service.ts # 附件（图片/语音/文件）
│   ├── todo.service.ts       # 待办
│   ├── voice.service.ts      # 语音录音（expo-audio）
│   ├── voiceRecord.service.ts
│   ├── search.service.ts     # LIKE 搜索（标题/内容/待办）
│   ├── savedLink.service.ts / linkMeta.service.ts / notification.service.ts
│   └── ai/                # AI 客户端（qwen/deepseek）、SSE、RAG、自动分类、会话
├── stores/                 # Zustand 状态（note/ai/todo/settings）
├── src/
│   ├── components/         # 通用 / 笔记 / 待办 / 创作浮层 / AI / 编辑器
│   ├── constants/          # 颜色、布局、类型定义
│   ├── theme/              # 双主题（水墨 SUMI / 极光 AURORA）
│   ├── animations/         # 自带动效 hooks
│   ├── context/            # PlusSheet 创作浮层上下文
│   ├── hooks/              # useVoiceRecorder 等
│   └── utils/              # 日期、uuid、HTML、附件等工具
└── docs/                   # 项目文档
```

## 已实现功能

### 笔记
- **手帖列表**：每日长卷（按天分组横向卷轴，scroll-snap 吸附）、日历视图、图库双栏瀑布流三视图切换。
- **多模态卡片**：文字 / 语音（声波动画）/ 图片缩略 / 链接区分展示；朱砂卷轴光条。
- **排序**：最近更新 / 创建时间 / 标题排序 + 升降序，列表与图库共享偏好。
- **分类筛选**：分类标签点选筛选，**长按分类标签进入编辑页**（改名/图标/颜色/删除），「＋ 分类」新建。
- **笔记 CRUD**：新建（富文本/图片）、详情、编辑、收藏、移动文件夹、软删除（回收站可恢复/彻底删除）。
- **编辑器**：新建/编辑合并同一页面（id 有无区分）；**自动保存**（防抖 2s + 保存状态指示器）、底部「放弃/完成」、拖入图片、AI 快捷操作；详情页题跋式标题、AI 摘要、录音播放卡片、更多操作浮层、底部编辑/分享。

### 创作（中央「+」记一笔）
- **点按**：弹出半屏创作浮层（初始态：速记条 + 六宫格 + AI 自动分类开关）。
- **长按**：直达语音速记（录音态，双层涟漪动画）。
- **录音态**：计时、3 键操作（放弃/完成/停止），保存为语音笔记。
- **AI 归类态**：AI 建议分类/标签/摘要，可修改后确认归档。

### AI（问墨）
- 流式（SSE）对话，支持多会话，引用溯源，基于本地笔记 RAG 作答。
- AI 自动分类 + 打标签 + 生成摘要；结果进入「待确认」队列，可**确认或修改分类/标签**，支持一键全部确认。
- 对话页纸间元素：描金关键词高亮、引用贴纸、印章式行动按钮、快捷指令纸签。

### 待办
- 今日三事、急签（朱砂/极光粉）、完成笔锋勾选 + 删除线、AI 提炼确认条、底部速记条。
- **待办详情页** `/todo/{id}`：新建/编辑独立页（完成勾选、描述、优先级三档、关联笔记、提醒、删除确认、保存）。
- **提醒**：`@react-native-community/datetimepicker` 选择日期时间，保存时排期系统通知（`expo-notifications`，需开发构建；Expo Go 下静默降级）。
- 新建待办合并到「记下一件事…」【＋】（标题预填），列表项点击进入详情。

### 链接库 / 导出 / 引导
- **链接库** `/saved-links`：保存链接、可增删标签（`link_tags` 独立标签表）、按标签筛选；`/link/new` 新增/编辑链接页（URL/标题/描述/标签，URL 失焦自动抓取预览）。
- **分享接收（Share Target）**：在任意 App/浏览器点「分享到 note-demo」，自动抽取 URL 存进链接库（`note-demo://save-link` 深链）。
- **全局截屏**：记一笔「截屏」或快速设置磁贴触发 `MediaProjection` 抓一帧，存为**敏感图片笔记**（默认不导出/不进 AI）。
- **导出数据**：设置页「导出」，生成全部笔记/待办 Markdown 并拉起分享。
- **Onboarding** `/onboarding`：四步引导 + 首次启动门控。<br>

### 设置 / 搜索空态
- **设置页**：日/夜主题分段切换、AI 服务/自动分类开关、账号与同步、数据（文件夹/收藏/回收站/导出）、通知开关、存储进度卡、关于。
- **搜索空态**：水墨插画「未寻得墨迹」+ 模式化副文案 + 「让问墨语义搜索」CTA（一键切 AI 语义）。

### 搜索
- 专用搜索页：**全文 / 标签 / AI 语义** 三模式；分类+时间筛选；搜索历史（最近墨迹，可清空/单删）；命中词描金高亮；AI 语义返回回答+引用可跳转原文。
- 底层为本地 LIKE 检索（笔记标题/内容、待办），稳定可靠（已规避 FTS 原生语句崩溃）。
- 笔记主页右上「🔍」进入搜索页（已移除主页内嵌搜索栏）。

## 设计 / 交互效果
- **双主题**：日间水墨 SUMI（宣纸白/焦墨黑/朱砂红）、夜间极光 AURORA（深空黑/毛玻璃/极光渐变），跟随系统或手动切换。
- **动效**：卡片入场交错、印章脉冲、声波律动、光环扩散（FAB/录音涟漪）、笔锋勾选、笔记入场交错等，均基于 RN Animated 自建模块实现，遵循设计方案 V2 第 9 章。

## 当前状态

- **进度**: P0 核心闭环（编辑器/详情/搜索/设置/空状态/待办详情）已全部落地并收尾
- **版本**: v0.1 (MVP)

## 文档

- [需求规格说明书](docs/01-需求规格说明书.md)
- [技术架构设计](docs/02-技术架构设计.md)
- [数据模型设计](docs/03-数据模型设计.md)
- [API 接口设计](docs/04-API接口设计.md)
- [UI 交互设计规范](docs/06-UI交互设计规范.md)
- [测试方案](docs/07-测试方案.md)
- [部署运维指南](docs/08-部署运维指南.md)
- [UI 设计方案 V2](docs/UI/note-demo-UI设计方案.md)
- [开发任务清单 / 完成记录](docs/09-开发任务清单.md)
- [UI 优化开发计划 · 补充页](docs/11-UI优化开发计划-补充页.md)
- [变更运行服务器手册](docs/12-变更运行服务器手册.md)
- [截图与链接抓取实施方案](docs/13-截图与链接抓取实施方案.md)

## License

MIT
