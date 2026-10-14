# note-demo APP 开发实施方案（续）

> **版本**: V1.0
> **范围**: 设置页 / 空状态页（搜索零结果） / 待办详情页（P0 核心闭环补充）
> **依据**: UI设计稿 V2 定稿 + 三张截图细化补充
> **日期**: 2026-08-06

---

## 目录

- [一、项目概述与范围](#一项目概述与范围)
- [二、Design Token 复用与补充](#二design-token-复用与补充)
- [三、页面四：设置页（Settings）](#三页面四设置页settings)
- [四、页面五：空状态页（EmptyState）](#四页面五空状态页emptystate)
- [五、页面六：待办详情页（TodoDetail）](#五页面六待办详情页tododetail)
- [六、全局状态扩展](#六全局状态扩展)
- [七、API 接口扩展](#七api-接口扩展)
- [八、组件库拆分清单（补充）](#八组件库拆分清单补充)
- [九、开发排期与里程碑（补充页）](#九开发排期与里程碑补充页)
- [十、性能与无障碍要求](#十性能与无障碍要求)

---

## 一、项目概述与范围

### 1.1 本次实施范围

基于提供的三张UI设计稿截图，本次开发实施聚焦 **P0 核心闭环** 中的三个补充页面：

| 页面 | 路由 | 定位 | 截图对应 |
|------|------|------|----------|
| **设置页** | `/settings` | 全局配置中心：主题/AI/账号/数据/通知/存储/关于 | 截图1 (2_296.png) |
| **空状态页** | `/search/empty`（嵌入搜索页） | 搜索无结果的首屏反馈 | 截图2 (2_431.png) |
| **待办详情页** | `/todo/:id` | 待办创建后的详情与编辑 | 截图3 (2_470.png) |

### 1.2 前置依赖（已定型）

- ✅ 设计系统 V2 已定稿（色彩/字体/圆角/阴影/动效）
- ✅ 底部 TabBar 导航已定稿（设置入口在 TabBar）
- ✅ 创作浮层（记一笔）三态已定稿
- ✅ 笔记列表页（手帖/每日长卷）已定稿
- ✅ 搜索页已定稿（本次为空状态变体补充）
- ✅ 待办页已定稿（本次为详情编辑页补充）

### 1.3 技术栈（与前序一致）

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript | 函数组件 + Hooks |
| 样式 | Tailwind CSS + CSS Variables | Design Token 驱动 |
| 状态 | Zustand | 全局主题 + 用户配置 + 笔记数据 |
| 路由 | React Router v6 | 堆栈导航模拟 |
| 动画 | Framer Motion | 页面过渡 + 手势 |
| 构建 | Vite | 快速开发 |

---

## 二、Design Token 复用与补充

### 2.1 复用 Token（与前序方案一致）

```css
/* === 日间 · 水墨 SUMI === */
--pbg: #F6F1E6;
--card: #FFFDF7;
--pfg: #1C1B18;
--acc: #B83A2A;
--mut: #8A8272;
--line: #E5DCC8;
--gold: #E8C56A;

/* === 夜间 · 极光 AURORA === */
--pbg: #0A0D1F;
--glass: rgba(255,255,255,.07);
--pfg: #F2F4FF;
--grd: linear-gradient(120deg, #4FD8EB, #8B7CFF 55%, #FF7AD9);
--mut: #96A0C6;
--gline: rgba(255,255,255,.14);
```

### 2.2 补充 Token（本批页面特有）

```css
/* === 设置页补充 === */
--settings-group-gap: 3px;        /* 分组间距（压缩后） */
--settings-card-padding: 12px 16px; /* 设置卡片内边距 */
--toggle-track-on: #B83A2A;       /* 开关开启轨道色 */
--toggle-track-off: #DCD6C8;      /* 开关关闭轨道色 */
--toggle-thumb: #FFFFFF;          /* 开关滑块色 */
--progress-track: #E5DCC8;        /* 进度条轨道 */
--progress-fill: #B83A2A;         /* 进度条填充 */
--storage-warn: #B83A2A;          /* 存储警告色 */

/* === 空状态补充 === */
--empty-illustration-size: 120px; /* 空状态插画尺寸 */
--empty-title-size: 18px;         /* 空状态标题字号 */

/* === 待办详情补充 === */
--todo-checkbox-size: 22px;       /* 复选框尺寸 */
--todo-checkbox-radius: 6px;      /* 复选框圆角 */
--todo-urgent-bg: #B83A2A;        /* 急签背景 */
--todo-urgent-text: #FFFFFF;      /* 急签文字 */
--todo-priority-inactive: #F0EBE0; /* 优先级未选背景 */
--todo-priority-active-border: #B83A2A; /* 优先级选中边框 */
```

---

## 三、页面四：设置页（Settings）

> **路由**: `/settings`
> **定位**: TabBar「设置」入口，承载主题与全局配置，一屏内完整展示
> **入口**: 底部 TabBar → 「设置」（⚙️ gear 图标）

### 3.1 页面结构（DOM 树）

```
Settings (页面容器)
├── StatusBar (系统状态栏 - 复用全局)
├── SettingsHeader (顶部导航栏)
│   ├── BackButton (返回 ←)
│   └── Title "设置"
├── SettingsBody (设置内容区 - 可滚动)
│   ├── ThemeToggle (主题切换分段按钮)
│   │   ├── Segment "日·水墨" (active)
│   │   │   └── SunIcon + Text
│   │   └── Segment "夜·极光" (inactive)
│   │       └── MoonIcon + Text
│   ├── Group "AI 服务"
│   │   └── CardRow
│   │       ├── IconPlaceholder
│   │       ├── Content
│   │       │   ├── Title "问墨 · AI 服务配置"
│   │       │   └── Subtitle "服务商 · API Key"
│   │       └── Arrow (›)
│   ├── CardRow "保存后自动分类"
│   │   ├── Title
│   │   ├── Subtitle "打标签"
│   │   └── ToggleSwitch (ON - 朱砂红)
│   ├── Group "账号与同步"
│   │   └── CardRow
│   │       ├── Avatar (40×40 圆形占位)
│   │       ├── Content
│   │       │   ├── Title "明月几时有"
│   │       │   └── Subtitle "本地模式 · 已登录"
│   │       └── Arrow (›)
│   ├── Group "数据"
│   │   ├── CardRow "导出 / 导入"
│   │   │   ├── Title
│   │   │   ├── Subtitle "长图 · PDF · Markdown · 迁移"
│   │   │   └── Arrow (›)
│   │   ├── CardRow "文件夹管理"
│   │   │   ├── Title
│   │   │   ├── Subtitle "工作 · 学习 · 生活 · 收藏夹"
│   │   │   └── Arrow (›)
│   │   ├── CardRow "归档"
│   │   │   ├── Title
│   │   │   ├── Subtitle "已归档 0 篇"
│   │   │   └── Arrow (›)
│   │   └── CardRow "回收站"
│   │       ├── Title
│   │       ├── Subtitle "30 天后自动清理"
│   │       └── Arrow (›)
│   ├── Group "通知"
│   │   └── CardRow "待办提醒"
│   │       ├── Title
│   │       └── ToggleSwitch (OFF - 灰)
│   ├── Group "存储"
│   │   └── StorageCard
│   │       ├── Header "已用 128 MB / 2 GB"
│   │       ├── ProgressBar (6.4% 朱砂填充)
│   │       └── Action "清理缓存 · 释放 34 MB"
│   └── Group "关于"
│       ├── CardRow "关于 note · demo"
│       │   ├── Title
│       │   └── Version "v2.4.0"
│       └── CardRow "意见与反馈"
│           ├── Title
│           └── Arrow (›)
└── TabBar (底部导航 - 复用全局)
```

### 3.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `SettingsHeader` | 分子 | 复用 | 顶部导航栏，复用全局 AppHeader |
| `ThemeToggle` | 分子 | **新增** | 日/夜分段切换按钮，核心新组件 |
| `GroupTitle` | 原子 | **新增** | 分组标题（如「AI 服务」「数据」） |
| `CardRow` | 分子 | **新增** | 设置项行，支持左图标+标题+副标题+右操作 |
| `ToggleSwitch` | 原子 | **新增** | 开关控件，30×17px，支持 ON/OFF 态 |
| `StorageCard` | 分子 | **新增** | 存储展示卡片，含进度条 |
| `ProgressBar` | 原子 | **新增** | 进度条组件 |

### 3.3 状态与交互

#### 状态定义

```typescript
interface SettingsState {
  // 主题设置
  theme: 'day' | 'night' | 'auto';
  systemTheme: 'day' | 'night';

  // AI 设置
  aiConfig: {
    provider: string;
    apiKey: string;
    autoClassify: boolean;  // 保存后自动分类
  };

  // 账号设置
  account: {
    nickname: string;
    avatar?: string;
    mode: 'local' | 'cloud';  // 本地模式 / 云端同步
    isLoggedIn: boolean;
  };

  // 通知设置
  notifications: {
    todoReminder: boolean;
  };

  // 存储信息
  storage: {
    used: number;      // 已用字节
    total: number;     // 总容量字节
    cacheSize: number; // 可清理缓存字节
  };

  // 数据概览
  dataOverview: {
    archivedCount: number;
    folderCategories: string[];
  };

  // 应用信息
  appInfo: {
    version: string;
    buildNumber: string;
  };
}
```

#### 核心交互流程

```
1. 进入页面
   ├─ 读取本地/云端配置，填充各设置项
   └─ 主题切换按钮显示当前生效主题

2. 主题切换（核心交互）
   ├─ 点击「日·水墨」→ 全局切换日间主题
   ├─ 点击「夜·极光」→ 全局切换夜间主题
   ├─ 切换即时生效，不打断当前任务
   └─ 保存偏好到 localStorage

3. AI 服务配置
   ├─ 点击「问墨 · AI 服务配置」行 → 进入 AI 配置子页
   └─ 子页内可设置：服务商选择、API Key 输入、模型选择

4. 自动分类开关
   ├─ 切换 ON/OFF
   └─ 即时保存，影响笔记保存后的自动分类行为

5. 账号与同步
   ├─ 未登录：显示「本地模式」+ 引导登录
   ├─ 已登录：显示昵称/头像 + 同步状态
   └─ 点击进入账号管理子页

6. 数据管理
   ├─ 导出/导入：进入导出/导入面板（长图/PDF/Markdown/迁移）
   ├─ 文件夹管理：进入文件夹管理子页（工作/学习/生活/收藏夹）
   ├─ 归档：进入归档列表页
   └─ 回收站：进入回收站页（30天自动清理提示）

7. 通知设置
   ├─ 待办提醒开关
   └─ OFF → 关闭系统通知；ON → 请求系统通知权限

8. 存储管理
   ├─ 显示已用/总量进度条
   ├─ 点击「清理缓存」→ 弹出确认 → 清理 → 更新进度
   └─ 低于 10% 时显示警告色

9. 关于
   ├─ 版本号展示（Unbounded 字体）
   ├─ 意见与反馈 → 调起系统邮件/反馈表单
   └─ 检查更新（可选）
```

### 3.4 数据结构

```typescript
// GET /api/settings
// 获取用户设置
interface GetSettingsResponse {
  theme: 'day' | 'night' | 'auto';
  aiConfig: {
    provider: string;
    autoClassify: boolean;
  };
  account: {
    nickname: string;
    avatar?: string;
    mode: 'local' | 'cloud';
  };
  notifications: {
    todoReminder: boolean;
  };
  storage: {
    used: number;
    total: number;
    cacheSize: number;
  };
  dataOverview: {
    archivedCount: number;
  };
}

// PUT /api/settings
// 更新设置（增量更新）
interface UpdateSettingsRequest {
  theme?: 'day' | 'night' | 'auto';
  aiConfig?: Partial<AIConfig>;
  notifications?: Partial<NotificationSettings>;
}

// POST /api/settings/clear-cache
// 清理缓存
interface ClearCacheResponse {
  freed: number;      // 释放字节数
  newUsed: number;    // 清理后已用字节数
}
```

### 3.5 关键样式实现

```css
/* 设置页容器 */
.settings-page {
  background: var(--pbg);
  min-height: 100vh;
  padding-bottom: 80px; /* TabBar 避让 */
}

/* 主题切换分段按钮 */
.theme-toggle {
  display: flex;
  margin: 16px;
  height: 48px;
  background: rgba(220, 214, 200, 0.5); /* 日间宣纸灰底 */
  border-radius: 999px;
  overflow: hidden;
}

.theme-toggle-segment {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mut);
  transition: all 0.3s ease;
}

.theme-toggle-segment.active {
  background: var(--pfg); /* 焦墨黑底 */
  color: var(--card);     /* 宣纸白字 */
  border-radius: 999px;
}

/* 夜间版主题切换 */
.night .theme-toggle {
  background: rgba(255, 255, 255, 0.08);
}

.night .theme-toggle-segment.active {
  background: var(--grd); /* 极光渐变底 */
  color: var(--pbg);      /* 深空黑字 */
}

/* 分组标题 */
.group-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--mut);
  padding: 12px 16px 6px;
  letter-spacing: 0.05em;
}

/* 设置卡片行 */
.card-row {
  display: flex;
  align-items: center;
  padding: var(--settings-card-padding);
  background: var(--card);
  margin: 0 16px;
  /* 连续卡片圆角处理 */
}

.card-row:first-child {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.card-row:last-child {
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.card-row:only-child {
  border-radius: var(--radius-lg);
}

.card-row-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(184, 58, 42, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.card-row-content {
  flex: 1;
  min-width: 0;
}

.card-row-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--pfg);
}

.card-row-subtitle {
  font-size: 11px;
  color: var(--mut);
  margin-top: 2px;
}

.card-row-arrow {
  font-size: 16px;
  color: var(--mut);
  margin-left: 8px;
}

/* 开关控件 */
.toggle-switch {
  width: 50px;
  height: 28px;
  border-radius: 14px;
  background: var(--toggle-track-off);
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  flex-shrink: 0;
}

.toggle-switch.on {
  background: var(--toggle-track-on);
}

.toggle-switch-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--toggle-thumb);
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch.on .toggle-switch-thumb {
  transform: translateX(22px);
}

/* 存储卡片 */
.storage-card {
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin: 0 16px;
}

.storage-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--pfg);
  margin-bottom: 10px;
}

.progress-bar {
  height: 4px;
  background: var(--progress-track);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--progress-fill);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.storage-action {
  font-size: 11px;
  color: var(--acc);
  margin-top: 8px;
  cursor: pointer;
}

/* 夜间玻璃卡片 */
.night .card-row,
.night .storage-card {
  background: var(--glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--gline);
}
```

---

## 四、页面五：空状态页（EmptyState）

> **路由**: 嵌入搜索页 `/search`（条件渲染）
> **定位**: 搜索无结果的首屏反馈，也是零笔记空状态的设计参考
> **触发**: 搜索关键词无命中笔记时展示

### 4.1 页面结构（DOM 树）

```
EmptyState (条件渲染区域，替换搜索结果区)
├── SearchHeader (复用搜索页头部 - 保留搜索框)
│   ├── BackButton
│   └── SearchInput "量子力学"
├── SearchModeTabs (复用 - 全文/标签/AI语义搜索)
├── FilterPills (复用 - 全部分类/近30天)
├── EmptyContent (空状态内容区)
│   ├── Illustration (水墨风插画)
│   │   ├── RedCurvedLine (朱砂弧线)
│   │   ├── MagnifyingGlass (放大镜 SVG)
│   │   └── ShadowOval (底部椭圆阴影)
│   ├── Title "未寻得墨迹"
│   │   └── 字体：思源宋体 900，18px
│   ├── Subtitle "没有与「量子力学」匹配的笔记，换个说法试试"
│   │   └── 字体：思源黑体 400，11px，淡墨灰
│   └── CTAButton "让问墨语义搜索"
│       ├── SparkleIcon (✨ 金色)
│       └── Text
└── (无底部 TabBar，由父页面 Search 提供)
```

### 4.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `SearchHeader` | 分子 | 复用 | 复用搜索页头部 |
| `SearchInput` | 分子 | 复用 | 复用搜索页输入框 |
| `SearchModeTabs` | 分子 | 复用 | 复用搜索页模式切换 |
| `FilterPills` | 分子 | 复用 | 复用搜索页筛选器 |
| `EmptyIllustration` | 分子 | **新增** | 水墨风 SVG 插画组件 |
| `CTAButton` | 原子 | 复用 | 复用朱砂印章按钮 |

### 4.3 状态与交互

#### 状态定义

```typescript
interface EmptyStateProps {
  query: string;              // 当前搜索关键词
  mode: 'fulltext' | 'tag' | 'ai';  // 当前搜索模式
  onAISearch: () => void;     // 切换 AI 语义搜索回调
  onClearQuery: () => void;   // 清空搜索词回调
}
```

#### 核心交互流程

```
1. 触发条件
   ├─ 用户输入搜索词并执行搜索
   ├─ 后端返回 results.length === 0
   └─ 搜索结果区切换为 EmptyState 展示

2. 展示内容
   ├─ 保留搜索框（显示当前关键词）
   ├─ 保留搜索模式 Tab 和筛选 pills（用户可切换模式重试）
   ├─ 中央展示水墨插画 + 标题 + 副标题
   └─ 底部 CTA 按钮

3. 用户操作路径
   ├─ 修改搜索词 → 重新触发搜索
   ├─ 切换搜索模式（全文→AI语义）→ 重新搜索
   ├─ 清除筛选条件 → 扩大搜索范围
   ├─ 点击「让问墨语义搜索」→ 自动切换 AI 模式并搜索
   └─ 返回上一页 → 回到笔记列表

4. 不同模式的空状态文案
   ├─ 全文搜索：「未寻得墨迹」「没有与「{query}」匹配的笔记，换个说法试试」
   ├─ 标签搜索：「未寻得墨迹」「没有「{tag}」标签的笔记」
   └─ AI 语义搜索：「未寻得相关笔记」「基于通用知识为你回答」+ AI 回答卡片
```

### 4.4 数据结构

```typescript
// 空状态无需独立 API，由搜索接口的 empty 响应驱动
interface SearchResponse {
  total: number;
  results: SearchResult[];
  isEmpty: boolean;        // true 时展示空状态
  suggestedQuery?: string; // 建议搜索词
}
```

### 4.5 关键样式实现

```css
/* 空状态容器 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  min-height: 400px;
}

/* 水墨插画 */
.empty-illustration {
  width: var(--empty-illustration-size);
  height: var(--empty-illustration-size);
  position: relative;
  margin-bottom: 24px;
}

/* 朱砂弧线 */
.illustration-arc {
  position: absolute;
  width: 60px;
  height: 80px;
  border-left: 2.5px solid var(--acc);
  border-radius: 50% 0 0 50%;
  left: 20px;
  top: 10px;
  transform: rotate(-15deg);
}

/* 放大镜 */
.illustration-glass {
  position: absolute;
  width: 50px;
  height: 50px;
  border: 2px solid var(--mut);
  border-radius: 50%;
  right: 10px;
  top: 20px;
}

.illustration-glass::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 2px;
  background: var(--mut);
  bottom: -4px;
  right: -2px;
  transform: rotate(45deg);
}

/* 底部阴影 */
.illustration-shadow {
  position: absolute;
  width: 80px;
  height: 12px;
  background: rgba(138, 130, 114, 0.15);
  border-radius: 50%;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
}

/* 空状态标题 */
.empty-title {
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: var(--empty-title-size);
  color: var(--pfg);
  margin-bottom: 10px;
}

/* 空状态副标题 */
.empty-subtitle {
  font-size: 11px;
  color: var(--mut);
  text-align: center;
  line-height: 1.6;
  margin-bottom: 24px;
}

/* CTA 按钮 */
.empty-cta {
  width: 100%;
  max-width: 280px;
  height: 48px;
  border-radius: 999px;
  background: var(--acc);
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-fab);
}

.empty-cta-icon {
  color: var(--gold); /* 金色星标 */
}

/* 夜间适配 */
.night .illustration-arc {
  border-left-color: #FF7AD9; /* 极光粉 */
}

.night .illustration-glass {
  border-color: var(--mut);
}

.night .empty-cta {
  background: var(--grd);
  color: var(--pbg);
}
```

---

## 五、页面六：待办详情页（TodoDetail）

> **路由**: `/todo/:id`
> **定位**: 待办创建后的详情与编辑，支持设提醒、优先级、关联笔记
> **触发**: 待办页点按待办项 / 创作浮层「待办」入口

### 5.1 页面结构（DOM 树）

```
TodoDetail (页面容器)
├── StatusBar (系统状态栏 - 复用全局)
├── TodoHeader (顶部导航栏)
│   ├── BackButton (返回 ←)
│   ├── Title "待办详情"
│   └── DeleteButton (🗑️ 删除图标)
├── TodoBody (内容主区域 - 可滚动)
│   ├── TodoCard (待办卡片容器)
│   │   ├── CheckboxRow (复选框行)
│   │   │   ├── Checkbox (22×22 圆角方框)
│   │   │   └── TitleInput "提交项目立项书初稿"
│   │   │       └── 字体：思源黑体 700，15px
│   │   ├── DescriptionSection (描述区)
│   │   │   ├── Label "描述"
│   │   │   └── DescriptionInput
│   │   │       ├── Placeholder "补充说明，例如截止时间、关键事项…"
│   │   │       └── 背景：淡底圆角输入区
│   │   ├── PrioritySection (优先级区)
│   │   │   ├── Label "优先级"
│   │   │   └── PrioritySelector (三档)
│   │   │       ├── Option "普通" (inactive)
│   │   │       ├── Option "急 · 今天" (active)
│   │   │       │   ├── UrgentIcon (⏰)
│   │   │       │   └── UrgentSeal (朱砂红底白字「急」签)
│   │   │       └── Option "加急" (inactive)
│   │   ├── ReminderSection (提醒区)
│   │   │   └── ReminderRow
│   │   │       ├── CalendarIcon
│   │   │       ├── Text "今天 14:00 提醒"
│   │   │       └── Arrow (›)
│   │   ├── LinkedNoteSection (关联笔记区)
│   │   │   └── LinkedNoteRow
│   │   │       ├── NoteIcon (📄)
│   │   │       ├── Content
│   │   │       │   ├── Title "评审会决策纪要"
│   │   │       │   └── Subtitle "关联文档 · 跳转查看"
│   │   │       └── Arrow (›)
│   │   └── AIExtractSection (AI提炼确认条)
│   │       ├── SparkleIcon (✨)
│   │       └── Text "问墨从近期笔记中提炼出此待办，点按确认归入列表"
│   └── (卡片外下方留白)
├── SaveButton (底部保存按钮)
│   └── Text "保存待办"
│       └── 样式：朱砂红底白字，全宽胶囊
└── (无 TabBar，沉浸编辑)
```

### 5.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `TodoHeader` | 分子 | 复用 | 顶部导航栏，右侧删除按钮 |
| `TodoCard` | 分子 | **新增** | 待办编辑卡片容器 |
| `Checkbox` | 原子 | **新增** | 复选框，支持完成态动画 |
| `DescriptionInput` | 原子 | **新增** | 多行描述输入区 |
| `PrioritySelector` | 分子 | **新增** | 三档优先级选择器 |
| `UrgentSeal` | 原子 | 复用 | 朱砂「急」签，复用已定稿 |
| `ReminderRow` | 分子 | **新增** | 提醒时间选择行 |
| `LinkedNoteRow` | 分子 | **新增** | 关联笔记跳转行 |
| `AIExtractBar` | 分子 | 复用 | AI提炼确认条，复用 aiban |
| `SaveButton` | 原子 | 复用 | 底部保存按钮，复用朱砂按钮 |

### 5.3 状态与交互

#### 状态定义

```typescript
interface TodoDetailState {
  todo: Todo | null;
  isLoading: boolean;
  isEditing: boolean;        // 是否编辑态
  hasChanges: boolean;       // 是否有未保存变更
  showDeleteConfirm: boolean;
  showDatePicker: boolean;   // 日期选择器显隐
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: 'normal' | 'urgent' | 'critical';  // 普通/急/加急
  dueDate?: string;          // ISO 8601
  reminderTime?: string;     // 提醒时间 ISO 8601
  linkedNoteId?: string;     // 关联笔记ID
  linkedNoteTitle?: string;  // 关联笔记标题
  isCompleted: boolean;
  isAIExtracted: boolean;    // 是否 AI 提炼生成
  aiSourceNoteId?: string;   // AI 来源笔记ID
  createdAt: string;
  updatedAt: string;
}
```

#### 核心交互流程

```
1. 进入页面
   ├─ 新建：标题输入自动聚焦，其余为空
   └─ 编辑：拉取待办数据，回填所有字段

2. 标题编辑
   ├─ 点击标题区域 → 进入编辑态
   ├─ 输入新标题
   └─ 失去焦点或回车 → 保存到本地状态

3. 完成切换
   ├─ 点击复选框 → 切换完成态
   ├─ 未完成 → 已完成：笔锋划勾动画(brush 0.7s) + 标题删除线
   └─ 已完成 → 未完成：取消勾选 + 删除线消失

4. 描述编辑
   ├─ 点击描述区 → 多行文本输入
   └─ 支持多行，自动增高

5. 优先级选择
   ├─ 三选一：普通 / 急·今天 / 加急
   ├─ 选中态：朱砂描边 + 背景高亮
   ├─ 「急」档：额外显示朱砂「急」签 + 闹钟图标
   └─ 夜间：急签 → 极光粉胶囊

6. 提醒时间设置
   ├─ 点击提醒行 → 弹出日期时间选择器
   ├─ 选择日期 + 时间
   └─ 确认后显示「今天 14:00 提醒」格式文案

7. 关联笔记
   ├─ 点击关联笔记行 → 进入笔记选择器
   ├─ 选择笔记 → 回填标题
   └─ 点击已关联笔记 → 跳转笔记详情页

8. AI 提炼确认条
   ├─ 若待办由 AI 从笔记提炼生成，显示确认条
   ├─ 点击确认条 → 标记为已确认，归入列表
   └─ 确认后确认条消失

9. 删除流程
   ├─ 点击顶部删除按钮 → 弹出确认 "确定删除此待办？"
   ├─ 确认 → 删除
   └─ 显示撤销 Toast（3s）

10. 保存流程
    ├─ 点击「保存待办」→ 校验必填（标题非空）
    ├─ 调用 saveTodo()
    ├─ 成功 → 返回待办列表页
    └─ 失败 → 显示错误提示
```

### 5.4 数据结构

```typescript
// GET /api/todos/:id
// 获取待办详情
interface GetTodoResponse {
  todo: Todo;
}

// POST /api/todos
// 创建待办
interface CreateTodoRequest {
  title: string;
  description?: string;
  priority?: 'normal' | 'urgent' | 'critical';
  dueDate?: string;
  reminderTime?: string;
  linkedNoteId?: string;
}

// PUT /api/todos/:id
// 更新待办
interface UpdateTodoRequest {
  title?: string;
  description?: string;
  priority?: 'normal' | 'urgent' | 'critical';
  dueDate?: string;
  reminderTime?: string;
  linkedNoteId?: string;
  isCompleted?: boolean;
}

// DELETE /api/todos/:id
// 删除待办

// POST /api/todos/:id/confirm-ai
// 确认 AI 提炼的待办
interface ConfirmAITodoResponse {
  todo: Todo;
  confirmed: boolean;
}

// GET /api/notes?mode=selector
// 笔记选择器列表（用于关联笔记）
interface NoteSelectorItem {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}
```

### 5.5 关键样式实现

```css
/* 待办卡片容器 */
.todo-card {
  background: var(--card);
  border-radius: var(--radius-lg);
  margin: 16px;
  padding: 16px;
  box-shadow: var(--shadow-card);
}

/* 复选框行 */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

/* 复选框 */
.checkbox {
  width: var(--todo-checkbox-size);
  height: var(--todo-checkbox-size);
  border: 1.8px solid var(--mut);
  border-radius: var(--todo-checkbox-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.checkbox.checked {
  background: var(--acc);
  border-color: var(--acc);
}

.checkbox-checkmark {
  width: 12px;
  height: 12px;
  stroke: white;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: brush 0.7s 0.1s ease forwards;
}

/* 标题输入 */
.todo-title-input {
  flex: 1;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 15px;
  color: var(--pfg);
  border: none;
  outline: none;
  background: transparent;
}

.todo-title-input.completed {
  text-decoration: line-through;
  color: var(--acc);
  opacity: 0.55;
}

/* 分区标签 */
.section-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--mut);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

/* 描述输入区 */
.description-input {
  width: 100%;
  min-height: 80px;
  background: rgba(229, 220, 200, 0.3);
  border-radius: var(--radius-md);
  padding: 12px;
  font-size: 12px;
  color: var(--pfg);
  border: none;
  outline: none;
  resize: none;
  line-height: 1.6;
}

.description-input::placeholder {
  color: var(--mut);
  font-size: 11px;
}

/* 优先级选择器 */
.priority-selector {
  display: flex;
  gap: 8px;
}

.priority-option {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-pill);
  background: var(--todo-priority-inactive);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mut);
  cursor: pointer;
  transition: all 0.2s;
}

.priority-option.active {
  background: transparent;
  border: 1.5px solid var(--todo-priority-active-border);
  color: var(--acc);
  font-weight: 700;
}

/* 急签 */
.urgent-seal {
  padding: 1px 7px;
  background: var(--todo-urgent-bg);
  color: var(--todo-urgent-text);
  font-family: var(--font-kai);
  font-size: 10.5px;
  border-radius: 4px;
  transform: rotate(-3deg);
}

/* 提醒行 / 关联笔记行 */
.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(229, 220, 200, 0.25);
  border-radius: var(--radius-md);
  margin-top: 10px;
  cursor: pointer;
}

.info-row-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--acc);
  flex-shrink: 0;
}

.info-row-content {
  flex: 1;
}

.info-row-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--pfg);
}

.info-row-subtitle {
  font-size: 10px;
  color: var(--mut);
  margin-top: 2px;
}

.info-row-arrow {
  color: var(--mut);
  font-size: 14px;
}

/* AI 提炼确认条 */
.ai-extract-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(232, 197, 106, 0.1);
  border: 1px dashed var(--gold);
  border-radius: var(--radius-md);
  margin-top: 12px;
  cursor: pointer;
}

.ai-extract-bar-icon {
  color: var(--gold);
  flex-shrink: 0;
}

.ai-extract-bar-text {
  font-size: 11px;
  color: var(--pfg);
  line-height: 1.5;
}

/* 保存按钮 */
.save-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px 24px;
  background: linear-gradient(to top, var(--pbg) 70%, transparent);
}

.save-button-inner {
  width: 100%;
  height: 48px;
  border-radius: 999px;
  background: var(--acc);
  color: white;
  font-size: 15px;
  font-weight: 700;
  border: none;
  box-shadow: var(--shadow-fab);
}

/* 夜间适配 */
.night .todo-card {
  background: var(--glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--gline);
}

.night .description-input {
  background: rgba(255, 255, 255, 0.05);
}

.night .priority-option {
  background: rgba(255, 255, 255, 0.05);
}

.night .info-row {
  background: rgba(255, 255, 255, 0.05);
}

.night .urgent-seal {
  background: #FF7AD9; /* 极光粉 */
  border-radius: 99px;
}

.night .ai-extract-bar {
  background: rgba(139, 124, 255, 0.1);
  border-color: #8B7CFF;
}
```

---

## 六、全局状态扩展

### 6.1 Zustand Store 补充（接上份方案）

```typescript
// stores/useAppStore.ts — 补充字段
interface AppState {
  // === 前序已有 ===
  // theme, currentRoute, notes, searchHistory, audioPlayer...

  // === 本次补充 ===

  // 用户设置
  settings: SettingsState;
  updateSettings: (patch: Partial<SettingsState>) => void;
  resetSettings: () => void;

  // 待办数据
  todos: Todo[];
  todoMap: Map<string, Todo>;
  setTodos: (todos: Todo[]) => void;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (id: string) => void;

  // 文件夹/分类
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;

  // 存储信息
  storageInfo: {
    used: number;
    total: number;
    cacheSize: number;
  };
  updateStorageInfo: (info: Partial<StorageInfo>) => void;

  // AI 配置
  aiConfig: {
    provider: string;
    apiKey?: string;
    autoClassify: boolean;
  };
  updateAIConfig: (config: Partial<AIConfig>) => void;
}

interface Folder {
  id: string;
  name: string;
  category: 'work' | 'study' | 'life' | 'favorite';
  count: number;
  children?: Folder[];
}
```

### 6.2 本地存储策略（补充）

| 数据 | 存储方式 | 说明 |
|------|----------|------|
| 用户设置 | localStorage + 云端同步 | 主题/AI/通知/账号 |
| 待办列表 | IndexedDB + 内存 | 实时同步 |
| 文件夹结构 | IndexedDB | 标签/分类树 |
| 存储信息 | 内存（实时计算） | 启动时计算 |

---

## 七、API 接口扩展

### 7.1 设置相关

```typescript
// GET /api/settings
// 获取用户全部设置

// PUT /api/settings
// 更新设置（增量）

// POST /api/settings/clear-cache
// 清理缓存

// GET /api/settings/storage
// 获取存储信息
interface StorageResponse {
  used: number;
  total: number;
  cacheSize: number;
  breakdown: {
    notes: number;
    attachments: number;
    cache: number;
  };
}
```

### 7.2 待办相关

```typescript
// GET /api/todos
// 获取待办列表
// Query: filter=today|week|inbox, category, completed

// GET /api/todos/:id
// 获取待办详情

// POST /api/todos
// 创建待办

// PUT /api/todos/:id
// 更新待办

// DELETE /api/todos/:id
// 删除待办

// POST /api/todos/:id/confirm-ai
// 确认 AI 提炼的待办

// GET /api/todos/ai-extract
// 从笔记中 AI 提炼待办建议
interface AIExtractResponse {
  suggestions: {
    title: string;
    priority: string;
    sourceNoteId: string;
    sourceNoteTitle: string;
  }[];
}
```

### 7.3 文件夹/分类相关

```typescript
// GET /api/folders
// 获取文件夹树
interface FolderResponse {
  folders: Folder[];
}

// PUT /api/folders/reorder
// 调整文件夹顺序

// GET /api/folders/:id/notes
// 获取文件夹下笔记
```

### 7.4 回收站相关

```typescript
// GET /api/trash
// 获取回收站列表

// POST /api/trash/:id/restore
// 恢复笔记

// DELETE /api/trash/:id
// 彻底删除

// DELETE /api/trash
// 清空回收站
```

---

## 八、组件库拆分清单（补充）

### 8.1 原子组件（补充）

| 组件 | 来源 | 说明 |
|------|------|------|
| `ToggleSwitch` | **新增** | 开关控件，支持 ON/OFF 动画 |
| `ProgressBar` | **新增** | 进度条，支持百分比显示 |
| `Checkbox` | **新增** | 复选框，支持笔锋划勾动画 |
| `UrgentSeal` | 复用 | 朱砂「急」签（已定稿） |

### 8.2 分子组件（补充）

| 组件 | 来源 | 说明 |
|------|------|------|
| `ThemeToggle` | **新增** | 日/夜分段切换按钮 |
| `CardRow` | **新增** | 设置项通用行（图标+内容+操作） |
| `StorageCard` | **新增** | 存储信息展示卡片 |
| `EmptyIllustration` | **新增** | 空状态水墨插画 |
| `PrioritySelector` | **新增** | 三档优先级选择器 |
| `ReminderRow` | **新增** | 提醒时间选择行 |
| `LinkedNoteRow` | **新增** | 关联笔记跳转行 |
| `AIExtractBar` | 复用 | AI提炼确认条（已定稿 aiban） |
| `GroupTitle` | **新增** | 设置分组标题 |

### 8.3 页面组件（补充）

| 组件 | 说明 |
|------|------|
| `Settings` | 设置页完整页面 |
| `EmptyState` | 空状态（搜索无结果变体） |
| `TodoDetail` | 待办详情页完整页面 |

---

## 九、开发排期与里程碑（补充页）

### 9.1 补充页开发阶段（接上份方案 W1~W6）

假设前三页（编辑器/详情/搜索）已进入 W3~W4，补充页可并行或接力开发：

| 阶段 | 周期 | 任务 | 产出 |
|------|------|------|------|
| **W2** | 2d | 设置页开发 | 主题切换 + 所有设置项 |
| **W2** | 2d | 空状态页开发 | 搜索零结果 + 零笔记双变体 |
| **W3** | 3d | 待办详情页开发 | 详情编辑 + 优先级 + 提醒 + 关联 |
| **W4** | 2d | 联调 + 双主题适配 | 三页完整 + 夜间模式 |
| **W5** | 2d | 设置子页开发（可选）| AI配置 / 文件夹管理 / 回收站 |

### 9.2 里程碑（补充）

- **M2（W2 结束）**: 设置页可配置，主题切换即时生效
- **M3（W3 结束）**: 待办详情可编辑保存，支持优先级与提醒
- **M4（W4 结束）**: 空状态双变体完整，双主题适配完成
- **M5（W5 结束）**: 设置子页（AI配置/文件夹/回收站）可用

---

## 十、性能与无障碍要求

### 10.1 性能指标（补充）

| 指标 | 目标 | 措施 |
|------|------|------|
| 设置页加载 | < 500ms | 配置本地缓存，首屏秒开 |
| 主题切换 | 即时 | CSS Variables 切换，无闪烁 |
| 待办保存 | < 300ms | 本地优先 + 后台同步 |
| 空状态插画 | SVG 内联 | 避免额外请求 |

### 10.2 无障碍要求（补充）

- [ ] 开关控件配 `role="switch"` + `aria-checked`
- [ ] 复选框配 `role="checkbox"` + `aria-checked`
- [ ] 设置项行作为按钮时配 `role="button"`
- [ ] 进度条配 `role="progressbar"` + `aria-valuenow/valuemax`
- [ ] 空状态插画配 `aria-hidden="true"`，标题配 `aria-live="polite"`
- [ ] 删除操作需二次确认，避免误触
- [ ] 优先级选择器支持键盘方向键切换

### 10.3 多端适配（补充）

| 场景 | 适配策略 |
|------|----------|
| 日期选择器 | iOS 调起 UIDatePicker / Android 调起原生选择器 |
| 通知权限 | iOS 请求 UNUserNotificationCenter / Android 请求 NotificationManager |
| 存储计算 | iOS 使用 NSFileManager / Android 使用 StatFs |
| 本地模式 | 无网络时所有设置仍可读改，联网后批量同步 |

---

## 附录：截图与已有设计文档对照索引

| 截图 | 页面 | 已有文档章节 | 本文档章节 |
|------|------|-------------|-----------|
| 截图1 (2_296.png) | 设置页 | §6 页面04 设置页 | §3 页面四：设置页 |
| 截图2 (2_431.png) | 空状态·搜索零结果 | §6 页面05 空状态页 | §4 页面五：空状态页 |
| 截图3 (2_470.png) | 待办详情页 | §6 页面06 待办详情 | §5 页面六：待办详情页 |

---

*本文档与前序《note-demo-开发实施方案.md》互为补充，合起来覆盖 P0 核心闭环全部 6 个页面。所有组件、样式、状态、接口均已细化到可直接编码的粒度。*
