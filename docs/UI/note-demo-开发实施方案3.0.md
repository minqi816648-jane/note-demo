# note-demo APP 开发实施方案（P1 扩展页）

> **版本**: V1.0
> **范围**: 日历视图 / 图库视图 / 附件预览 / 分享导出（P1 次期 4 页）
> **依据**: UI设计稿 V2 定稿 + 四张截图细化补充
> **日期**: 2026-08-07

---

## 目录

- [一、项目概述与范围](#一项目概述与范围)
- [二、Design Token 复用与补充](#二design-token-复用与补充)
- [三、页面七：日历视图（Calendar）](#三页面七日历视图calendar)
- [四、页面八：图库视图（Gallery）](#四页面八图库视图gallery)
- [五、页面十：附件预览（AttachmentPreview）](#五页面十附件预览attachmentpreview)
- [六、页面十一：分享导出（ShareExport）](#六页面十一分享导出shareexport)
- [七、全局状态扩展](#七全局状态扩展)
- [八、API 接口扩展](#八api-接口扩展)
- [九、组件库拆分清单（补充）](#九组件库拆分清单补充)
- [十、开发排期与里程碑](#十开发排期与里程碑)
- [十一、性能与无障碍要求](#十一性能与无障碍要求)

---

## 一、项目概述与范围

### 1.1 本次实施范围

基于提供的四张UI设计稿截图，本次开发实施聚焦 **P1 次期** 中的四个扩展页面：

| 页面 | 路由 | 定位 | 截图对应 |
|------|------|------|----------|
| **日历视图** | 主页内嵌（手帖 `tabs/index.tsx`） | 按日历格展示笔记密度，点日期展开当日长卷 | P7-日历-日间.png |
| **图库视图** | 主页内嵌（手帖 `tabs/index.tsx`） | 双栏瀑布流，图片/视频/OCR 多模态浏览 | P8-图库-日间.png |
| **附件预览** | `/attachment/:id` | PDF/Word/txt 内置预览 + 底部操作 | P10-附件-日间.png |
| **分享导出** | `/share/:noteId` | Bottom Sheet 浮层：长图/PDF/MD/链接 | P11-分享-日间.png |

> **路由调整说明（2026-08-07）**：日历、图库由初稿的独立路由 `/calendar`、`/gallery` **回归为手帖主页内嵌视图**，通过 `ViewToggle` 三分段切换（list/calendar/gallery）。实现组件为 `src/components/note/CalendarView.tsx` 与 `src/components/note/GalleryView.tsx`，复用 `src/components/calendar/*` 与 `src/components/gallery/*`。

### 1.2 前置依赖（已定型）

- ✅ 设计系统 V2 已定稿（色彩/字体/圆角/阴影/动效）
- ✅ 底部 TabBar 导航已定稿（手帖/问墨/+/待办/设置）
- ✅ 笔记列表页（手帖/每日长卷）已定稿
- ✅ 长卷卡 scard 组件已定稿
- ✅ 视图切换控件（列表/日历/图库三分段）已定稿
- ✅ Bottom Sheet sheetUp 动效已定稿

### 1.3 技术栈（本次以 React Native 为准，覆盖初稿的 Web 选型）

> **注意**：本页初稿的技术选型（Tailwind CSS / React Router v6 / Framer Motion / pdf.js / Vite）为 Web 栈，与本仓库实际采用的 **React Native + Expo** 不符。以下为对齐后的落地技术栈，本文将「CSS Token」章节视为**设计规格/组件规格**参照，编码时映射到 RN 的 StyleSheet 与 Design Token 常量。

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 + TypeScript | 函数组件 + Hooks |
| 样式 | StyleSheet + Design Token | 常量见 `src/constants/colors.ts` / `src/constants/layout.ts` |
| 状态 | Zustand | `useNoteStore` / `settingsStore` 等 |
| 路由 | expo-router | 日历/图库内嵌于手帖 `tabs/index.tsx`；`app/attachment/[id]`；ShareSheet 浮层 |
| 动画 | RN 内置 Animated（`src/animations`） | sheetUp / 页面过渡 / 墨点簇 |
| 数据 | expo-sqlite 服务层 | `services/*.service.ts`，本地聚合，无后端 REST |
| PDF/Word 预览 | react-native-webview 渲染 | 另存/外部打开用 `expo-sharing` / `expo-file-system` |
| 构建 | Expo SDK 57 | `expo start` |

---

## 二、Design Token 复用与补充

### 2.1 复用 Token

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

### 2.2 补充 Token

```css
/* === 日历视图补充 === */
--cal-grid-size: 38px;           /* 日历格高度 */
--cal-dot-size-sm: 3px;          /* 小墨点 */
--cal-dot-size-md: 4px;          /* 中墨点 */
--cal-today-ring: #B83A2A;       /* 今日圆环描边 */
--cal-today-bg: #F5E2DD;         /* 今日格底色（日间淡朱砂） */
--cal-weekend-text: #B9AF97;     /* 周末日期色 */
--cal-prev-month-text: #D4CBB8;  /* 上月尾日期色 */

/* === 图库视图补充 === */
--gallery-gap: 8px;              /* 瀑布流间距 */
--gallery-card-radius: 12px;     /* 图库卡片圆角 */
--ocr-badge-bg: rgba(0,0,0,0.6); /* OCR角标底 */
--video-badge-bg: rgba(0,0,0,0.5); /* 视频播放标记底 */
--fail-placeholder-bg: #E8E3D8;  /* 加载失败占位底 */

/* === 附件预览补充 === */
--doc-preview-bg: #FFFFFF;       /* 文档预览白底 */
--doc-text: #1C1B18;             /* 文档内文字 */
--doc-title-size: 20px;          /* PDF内标题字号 */
--doc-body-size: 12px;           /* PDF内正文字号 */
--tool-card-bg: #FBF7EC;         /* 工具卡底色 */
--tool-card-border: #E5DCC8;     /* 工具卡描边 */
--tool-icon-bg: #F6F1E6;         /* 工具图标底 */

/* === 分享导出补充 === */
--sheet-bg: #FBF7EC;             /* sheet浮层底色 */
--inkcard-bg: #FFFDF7;           /* 长图卡预览底色 */
--share-link-bg: #F0EBE0;        /* 分享链接输入底 */
--copy-btn-bg: #1C1B18;          /* 复制按钮深墨底 */
```

---

## 三、页面七：日历视图（Calendar）

> **路由**: 主页内嵌（手帖 `tabs/index.tsx`，`CalendarView` 组件）
> **定位**: 按日历格展示笔记密度，点击日期展开当日笔记长卷（直排全量）
> **触发**: 列表页头部视图切换「日历」（vtoggle 的 cal 项）

### 3.1 页面结构（DOM 树）

```
Calendar (页面容器)
├── StatusBar (系统状态栏 - 复用全局)
├── CalendarHeader (顶部导航栏)
│   ├── BackButton (返回 ←)
│   ├── Title "手帖"
│   └── ViewToggle (视图切换)
│       ├── ListIcon (列表)
│       ├── CalendarIcon (日历 - active)
│       └── GridIcon (图库)
├── MonthHeader (月头区)
│   ├── MonthNav (月切换)
│   │   ├── PrevButton ◀ (卷轴语义)
│   │   ├── MonthTitle "2026年8月"
│   │   └── NextButton ▶
│   └── TodayMeta (今日题记)
│       ├── TodayDot (朱砂圆点描边)
│       └── Text "8月5日 · 已记3笔"
├── WeekdayRow (星期首字行)
│   └── Weekday[] (一 二 三 四 五 六 日)
├── CalendarGrid (月历网格)
│   └── CalendarCell[] (7列×6行)
│       ├── DateNumber (日期数字)
│       └── InkDots (墨点密度)
│           ├── Dot[] (1~5枚墨点簇)
│           └── CountBadge (楷体数字，>5笔时)
├── DayRoll (当日长卷 - 条件展开)
│   ├── DayRollHeader
│   │   ├── DiamondNode (菱形节点 · 朱砂红)
│   │   ├── DateText "8月5日 · 3条"
│   │   └── MoreLink ▸
│   └── HorizontalScroll (横向滚动)
│       └── NoteCard[] (复用 scard)
│           ├── TextCard (文字笔记)
│           ├── AudioCard (语音·声波动画)
│           └── ImageCard (图片·缩略图)
└── TabBar (底部导航 - 复用全局)
```

### 3.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `CalendarHeader` | 分子 | 复用 | 复用笔记列表页头部 |
| `ViewToggle` | 分子 | 复用 | 三分段切换控件（列表/日历/图库） |
| `MonthNav` | 分子 | **新增** | 月切换导航，卷轴左右语义 |
| `TodayDot` | 原子 | **新增** | 今日朱砂圆点描边 |
| `CalendarCell` | 分子 | **新增** | 单格日历单元 |
| `InkDots` | 原子 | **新增** | 墨点密度渲染（1~5枚） |
| `DayRoll` | 分子 | **新增** | 当日长卷展开区 |
| `NoteCard` | 分子 | 复用 | 复用长卷卡 scard |

### 3.3 状态与交互

#### 状态定义

```typescript
interface CalendarState {
  currentYear: number;
  currentMonth: number;        // 0-11
  selectedDate: string | null; // YYYY-MM-DD，选中日期
  notesByDate: Map<string, Note[]>; // 日期→笔记列表
  monthData: CalendarCellData[][]; // 6行×7列
  isLoading: boolean;
}

interface CalendarCellData {
  date: string | null;         // null 表示上月/下月补位
  dayOfMonth: number | null;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  noteCount: number;
  notes: Note[];
}
```

#### 核心交互流程

```
1. 进入页面
   ├─ 默认展示当前月份
   ├─ 计算月历网格（含上月尾/下月头补位）
   ├─ 拉取当月笔记分布数据
   └─ 若有今日笔记，自动展开今日长卷

2. 月历渲染
   ├─ 每格展示：日期数字 + 墨点密度
   ├─ 墨点密度映射：
   │   ├─ 0 笔：空白格，仅灰色日期数字
   │   ├─ 1~2 笔：1~2 枚小墨点（3px）
   │   ├─ 3~5 笔：3~4 枚中墨点（4px）
   │   └─ >5 笔：一簇墨点 + 楷体数字标 count
   ├─ 今日格：朱砂圆点描边 + 淡朱砂底圆 + 数字居中
   ├─ 周末：日期数字淡色
   └─ 非当月：日期数字极淡色

3. 日期点击
   ├─ 点击有笔记的日期 → 下方展开当日长卷
   ├─ 长卷横向滚动，scroll-snap
   ├─ 复用 scard 组件（文字/语音/图片）
   └─ 再次点击已展开的日期 → 收起长卷

4. 月切换
   ├─ 点击 ◀/▶ 切换上月/下月
   ├─ 支持左右滑动手势切换月份
   ├─ 切换时保留已选日期或收起长卷
   └─ 加载新月份笔记数据

5. 长卷卡片点击
   ├─ 点击 scard → 进入笔记详情页 /note/:id
   └─ 返回时保留日历滚动位置和当前选中月

6. 今日快捷
   ├─ 点击题记区「8月5日」→ 滚动到今日格并展开
   └─ 月头显示当月笔记总数
```

### 3.4 数据结构

```typescript
// GET /api/notes/calendar
// 获取日历视图笔记分布
interface CalendarNotesRequest {
  year: number;
  month: number; // 0-11
}

interface CalendarNotesResponse {
  month: number;
  year: number;
  days: {
    date: string;        // YYYY-MM-DD
    noteCount: number;
    notes: CalendarNote[];
  }[];
}

interface CalendarNote {
  id: string;
  title: string;
  type: 'text' | 'audio' | 'image' | 'link';
  category: string;
  createdAt: string;
  thumbnail?: string;    // 图片缩略图/视频首帧
  duration?: number;     // 音频时长
  summary?: string;
}
```

### 3.5 关键样式实现

```css
/* 月头区 */
.month-header {
  padding: 12px 16px;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.month-nav-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pfg);
  font-size: 14px;
}

.month-title {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 16px;
  color: var(--pfg);
}

.today-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--mut);
}

.today-dot {
  width: 8px;
  height: 8px;
  border: 1.6px solid var(--cal-today-ring);
  border-radius: 50%;
  background: var(--cal-today-ring);
}

/* 星期行 */
.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  padding: 8px 0;
  font-size: 11px;
  color: var(--mut);
}

/* 月历网格 */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: 0 12px;
}

.calendar-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 6px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  min-height: var(--cal-grid-size);
}

.calendar-cell:hover {
  background: rgba(229, 220, 200, 0.3);
}

/* 今日格 */
.calendar-cell.today {
  background: var(--cal-today-bg);
}

.calendar-cell.today .date-number {
  color: var(--acc);
  font-weight: 700;
}

/* 日期数字 */
.date-number {
  font-size: 12px;
  color: var(--pfg);
  line-height: 1;
}

.date-number.weekend {
  color: var(--cal-weekend-text);
}

.date-number.other-month {
  color: var(--cal-prev-month-text);
}

/* 墨点密度 */
.ink-dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  margin-top: 4px;
  max-width: 28px;
}

.ink-dot {
  border-radius: 50%;
  background: linear-gradient(135deg, #3A362E, #B9AF97);
}

.ink-dot.sm {
  width: var(--cal-dot-size-sm);
  height: var(--cal-dot-size-sm);
}

.ink-dot.md {
  width: var(--cal-dot-size-md);
  height: var(--cal-dot-size-md);
}

.ink-count {
  font-family: var(--font-kai);
  font-size: 9px;
  color: var(--acc);
  margin-top: 2px;
}

/* 当日长卷 */
.day-roll {
  margin-top: 16px;
  padding: 0 16px;
  animation: inkIn 0.4s ease;
}

.day-roll-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.diamond-node {
  width: 7px;
  height: 7px;
  background: var(--acc);
  transform: rotate(45deg);
  flex-shrink: 0;
}

.day-roll-title {
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: 12px;
  color: var(--pfg);
}

.day-roll-count {
  font-size: 9px;
  color: var(--mut);
}

.day-roll-more {
  margin-left: auto;
  font-size: 11px;
  color: var(--acc);
}

/* 横向滚动区 */
.day-roll-scroll {
  display: flex;
  gap: 9px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 8px;
  scrollbar-width: none;
}

.day-roll-scroll::-webkit-scrollbar {
  display: none;
}

.day-roll-scroll .scard {
  scroll-snap-align: start;
  flex: 0 0 148px;
}

/* 夜间适配 */
.night .ink-dot {
  background: linear-gradient(135deg, #4FD8EB, #8B7CFF, #FF7AD9);
}

.night .calendar-cell.today {
  background: rgba(79, 216, 235, 0.15);
}

.night .date-number {
  color: var(--pfg);
}

.night .date-number.weekend,
.night .date-number.other-month {
  color: #5A668F;
}
```

---

## 四、页面八：图库视图（Gallery）

> **路由**: 主页内嵌（手帖 `tabs/index.tsx`，`GalleryView` 组件）
> **定位**: 双栏瀑布流，图片/视频/OCR 文档多模态浏览
> **触发**: 列表页头部视图切换「图库」（vtoggle 的 grid 项）

### 4.1 页面结构（DOM 树）

```
Gallery (页面容器)
├── StatusBar (系统状态栏 - 复用全局)
├── GalleryHeader (顶部导航栏)
│   ├── Title "手帖"
│   └── ViewToggle (视图切换 - 图库选中)
├── CategoryPills (分类筛选)
│   ├── Pill "全部" (active)
│   ├── Pill "图片"
│   ├── Pill "视频"
│   └── Pill "OCR 文档"
├── YearGroup[] (年月分组)
│   ├── YearGroupHeader (可折叠)
│   │   ├── ToggleIcon ▾
│   │   ├── YearMonth "2026年8月"
│   │   └── Count "12"
│   └── MasonryGrid (双栏瀑布流)
│       └── GalleryCard[]
│           ├── ImageCard (图片)
│           │   ├── Thumbnail (首图打底)
│           │   ├── OCRBadge "OCR文字" (条件)
│           │   └── InfoOverlay
│           │       ├── Title "会议纪要截图"
│           │       └── Meta "8月3日 14:05"
│           ├── VideoCard (视频)
│           │   ├── Thumbnail (首帧)
│           │   ├── PlayButton ▶
│           │   ├── Duration "00:47"
│           │   └── InfoOverlay
│           │       ├── Title "产品评审录屏"
│           │       └── Meta "8月2日 · 视频"
│           ├── AbstractCard (无图笔记)
│           │   ├── AbstractBg (墨色抽象底 SVG)
│           │   └── InfoOverlay
│           │       ├── Title "读书摘录·长页"
│           │       └── Meta "8月1日 · OCR"
│           └── FailCard (加载失败)
│               ├── FailPlaceholder
│               │   └── Text "图已失墨 · 点击重试"
│               └── InfoOverlay
│                   ├── Title "草稿插图"
└── TabBar (底部导航 - 复用全局)
```

### 4.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `GalleryHeader` | 分子 | 复用 | 复用笔记列表页头部（无返回） |
| `ViewToggle` | 分子 | 复用 | 三分段切换，图库选中 |
| `CategoryPills` | 分子 | 复用 | 分类筛选 pills |
| `YearGroup` | 分子 | **新增** | 年月可折叠分组 |
| `MasonryGrid` | 分子 | **新增** | 双栏瀑布流容器 |
| `GalleryCard` | 分子 | **新增** | 图库卡片基类 |
| `ImageCard` | 分子 | **新增** | 图片卡片（含 OCR 角标） |
| `VideoCard` | 分子 | **新增** | 视频卡片（含播放标记+时长） |
| `AbstractCard` | 分子 | **新增** | 无图笔记（墨色抽象底） |
| `FailCard` | 分子 | **新增** | 加载失败占位 |
| `OCRBadge` | 原子 | **新增** | OCR 文字角标 |

### 4.3 状态与交互

#### 状态定义

```typescript
interface GalleryState {
  selectedCategory: 'all' | 'image' | 'video' | 'ocr';
  expandedGroups: Set<string>;      // 已展开的年月分组
  galleryItems: GalleryItem[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

interface GalleryItem {
  id: string;
  noteId: string;
  type: 'image' | 'video' | 'ocr' | 'abstract';
  title: string;
  thumbnail?: string;
  fallbackColor?: string;           // 抽象底色
  ocrText?: string;                 // OCR 识别文字
  duration?: number;                // 视频时长（秒）
  createdAt: string;
  category: string;
  hasError: boolean;                // 加载失败标记
}

interface YearMonthGroup {
  key: string;                      // "2026-08"
  yearMonth: string;                // "2026年8月"
  count: number;
  items: GalleryItem[];
}
```

#### 核心交互流程

```
1. 进入页面
   ├─ 默认展示「全部」分类
   ├─ 按年月分组折叠展示
   ├─ 双栏瀑布流 masonry 布局
   └─ 懒加载首屏内容

2. 分类筛选
   ├─ 全部：展示所有类型卡片
   ├─ 图片：仅图片类型
   ├─ 视频：仅视频类型
   └─ OCR 文档：仅 OCR 识别过的文档
   → 切换后重新过滤并 masonry 重排

3. 年月分组折叠
   ├─ 点击分组头 ▾ → 收起该组卡片（▸）
   ├─ 点击分组头 ▸ → 展开该组卡片（▾）
   └─ 展开/收起带动画

4. 卡片交互
   ├─ 点击 ImageCard → 全屏看图器（大图+左右滑切笔记）
   ├─ 点击 VideoCard → 全屏视频播放器
   ├─ 点击 AbstractCard → 进入笔记详情
   ├─ 点击 FailCard → 重新加载图片
   └─ 长按卡片 → 弹出操作菜单（收藏/删除/分享）

5. 大图查看器
   ├─ 捏合缩放 + 双击放大
   ├─ 左右滑切换相邻图片
   ├─ 下滑关闭（dismiss）
   └─ 显示笔记标题和日期

6. 懒加载
   ├─ 图片使用缩略图 CDN
   ├─ 滚动到底部加载更多
   └─ 视频首帧预加载，播放时加载视频

7. 加载失败处理
   ├─ 显示「图已失墨 · 点击重试」占位
   ├─ 点击重试 → 重新请求图片
   └─ 多次失败提示「请检查网络」
```

### 4.4 数据结构

```typescript
// GET /api/gallery
// 获取图库内容
interface GalleryRequest {
  category?: 'all' | 'image' | 'video' | 'ocr';
  page: number;
  pageSize: number;
}

interface GalleryResponse {
  groups: YearMonthGroup[];
  hasMore: boolean;
}

// GET /api/notes/:id/image
// 获取笔记大图

// POST /api/notes/:id/image/retry
// 重新加载失败图片
```

### 4.5 关键样式实现

```css
/* 图库容器 */
.gallery-page {
  background: var(--pbg);
  min-height: 100vh;
  padding-bottom: 80px;
}

/* 分类 pills */
.category-pills {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-pills::-webkit-scrollbar {
  display: none;
}

/* 年月分组头 */
.year-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px 8px;
  cursor: pointer;
  user-select: none;
}

.year-group-toggle {
  font-size: 10px;
  color: var(--pfg);
  transition: transform 0.2s;
}

.year-group-toggle.collapsed {
  transform: rotate(-90deg);
}

.year-group-title {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 13px;
  color: var(--pfg);
}

.year-group-count {
  font-size: 10px;
  color: var(--mut);
}

/* 瀑布流网格 */
.masonry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gallery-gap);
  padding: 0 16px;
}

/* 图库卡片通用 */
.gallery-card {
  border-radius: var(--gallery-card-radius);
  overflow: hidden;
  position: relative;
  background: var(--card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.2s;
}

.gallery-card:active {
  transform: scale(0.98);
}

.gallery-card-media {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

/* OCR 角标 */
.ocr-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  background: var(--ocr-badge-bg);
  color: white;
  font-size: 9px;
  border-radius: 99px;
  backdrop-filter: blur(4px);
}

/* 视频播放标记 */
.video-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 1px 6px;
  background: rgba(0,0,0,0.5);
  color: white;
  font-size: 9px;
  border-radius: 4px;
  font-family: var(--font-num);
}

/* 信息浮层 */
.gallery-card-info {
  padding: 8px 10px;
  background: var(--card);
}

.gallery-card-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--pfg);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.gallery-card-meta {
  font-size: 9px;
  color: var(--mut);
  margin-top: 3px;
}

/* 墨色抽象底 */
.abstract-bg {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(135deg, #E5DCC8 0%, #D4CBB8 50%, #C7BB9E 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.abstract-bg-pattern {
  width: 60%;
  height: 60%;
  opacity: 0.15;
  /* SVG 墨晕图案 */
}

/* 加载失败占位 */
.fail-placeholder {
  width: 100%;
  aspect-ratio: 1;
  background: var(--fail-placeholder-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.fail-placeholder-text {
  font-size: 10px;
  color: var(--mut);
}

/* 夜间适配 */
.night .gallery-card {
  background: var(--glass);
  border: 1px solid var(--gline);
}

.night .gallery-card-info {
  background: transparent;
}

.night .abstract-bg {
  background: linear-gradient(135deg, #1A2040 0%, #232A4F 50%, #2A3055 100%);
}

.night .fail-placeholder {
  background: #1A2040;
}
```

---

## 五、页面十：附件预览（AttachmentPreview）

> **路由**: `/attachment/:id`
> **定位**: PDF/Word/txt 全屏内置预览，底部操作条
> **触发**: 笔记内附件卡片点击

> **实现说明（2026-08-07）**：本页已落地为 `app/attachment/[id].tsx`。类型分发：图片全屏 `Image`、录音复用 `AudioCard`、txt 用 `File.text()` 内联展示、PDF/Word 当前给出「用其他App打开」引导（内嵌渲染待后续集成原生查看器）。底部工具条：另存 / 用其他App打开（`expo-sharing`）/ 复制链接（`expo-clipboard`，复制本地 file URI）。入口：笔记详情 `AttachmentList` 中非图片附件点击跳转。**文件附件上传**已实现（用 expo-file-system `File.pickFileAsync`，类型 `file`）：「＋」浮层的「附件」选文件→先建笔记→写 DB 记录→进编辑页；编辑页「📎 附件」对已存笔记即时调用 `persistFileAttachment` 写 DB 记录。

### 5.1 页面结构（DOM 树）

```
AttachmentPreview (页面容器)
├── StatusBar (系统状态栏 - 复用全局)
├── PreviewHeader (顶部标题栏)
│   ├── BackButton (返回 ←)
│   ├── FileInfo
│   │   ├── FileName "评审会-排期表.pdf"
│   │   └── FileMeta "PDF · 1.2 MB · 8页"
│   └── MoreButton (⋯)
├── PreviewBody (预览主区域 - 可滚动)
│   └── DocumentViewer (文档渲染区)
│       ├── PDFRenderer (pdf.js 渲染)
│       │   ├── PageIndicator "1/8"
│       │   ├── PDFContent
│       │   │   ├── DocTitle "季度评审核排期表"
│       │   │   ├── DocMeta "2026年8月 · 项目组"
│       │   │   ├── Divider (横线)
│       │   │   └── DocBody
│       │   │       ├── FieldRow "事项：确认项目立项评审与上线排期（9月15日）"
│       │   │       ├── FieldRow "主讲：张老师 · 产品组全体"
│       │   │       ├── FieldRow "地点：501会议室（线上同步）"
│       │   │       └── StatusRow "状态：待确认" (朱砂红)
│       │   └── PageNav (翻页)
│       ├── WordRenderer (Word 转 HTML)
│       └── TextRenderer (txt 纯文本)
└── PreviewFooter (底部操作条)
    └── ToolBar (三卡工具条)
        ├── ToolCard "另存"
        │   ├── Icon (下载 ↓)
        │   └── Label "另存"
        ├── ToolCard "用其他App打开"
        │   ├── Icon (外部打开)
        │   └── Label "用其他App打开"
        └── ToolCard "复制链接"
            ├── Icon (链接)
            └── Label "复制链接"
```

### 5.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `PreviewHeader` | 分子 | **新增** | 水墨标题栏，文件名+元数据 |
| `PDFRenderer` | 分子 | **新增** | pdf.js 封装，支持翻页 |
| `WordRenderer` | 分子 | **新增** | Word 转 HTML 渲染 |
| `TextRenderer` | 分子 | **新增** | txt 纯文本渲染 |
| `DocumentViewer` | 分子 | **新增** | 文档渲染路由（按类型分发） |
| `ToolBar` | 分子 | **新增** | 底部三卡操作条 |
| `ToolCard` | 原子 | **新增** | 单卡工具按钮 |
| `PageIndicator` | 原子 | **新增** | 页码指示器 |

### 5.3 状态与交互

#### 状态定义

```typescript
interface PreviewState {
  attachment: Attachment | null;
  fileType: 'pdf' | 'word' | 'txt' | 'audio' | 'unknown';
  isLoading: boolean;
  error: string | null;
  currentPage: number;       // PDF 当前页
  totalPages: number;        // PDF 总页数
  zoomLevel: number;         // 缩放级别
  isFullScreen: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'txt' | 'audio';
  url: string;
  size: number;              // 字节
  pageCount?: number;        // PDF 页数
  mimeType: string;
}
```

#### 核心交互流程

```
1. 进入页面
   ├─ 读取附件 ID 和类型
   ├─ 根据类型选择渲染器：PDF / Word / txt / 录音
   ├─ 显示加载状态
   └─ 渲染文档内容

2. PDF 预览
   ├─ 使用 pdf.js 渲染当前页
   ├─ 支持上下滑动翻页
   ├─ 显示页码指示器 "1/8"
   ├─ 双击放大/缩小
   ├─  pinch 捏合缩放
   └─ 渲染失败时提示「此附件暂无法预览」

3. Word 预览
   ├─ 后端转 HTML 或前端解析（mammoth.js）
   ├─ 白底阅读，保持排版
   └─ 超链接可点击跳转

4. txt 预览
   ├─ 纯文本渲染
   ├─ 保持换行和缩进
   └─ 支持文本选中复制

5. 录音预览
   ├─ 复用 inkwave 大号声波动画
   ├─ 进度条（朱砂走针）
   ├─ 播放/暂停控制
   └─ 时长显示

6. 底部操作
   ├─ 另存：下载文件到本地
   ├─ 用其他 App 打开：调起系统分享面板
   └─ 复制链接：复制附件 URL 到剪贴板

7. 更多操作（⋯）
   ├─ 重命名
   ├─ 移动到笔记
   └─ 删除附件

8. 超大文件处理
   ├─ >50MB 提示「文件过大，建议外部打开」
   └─ 提供下载按钮而非内置预览
```

### 5.4 数据结构

```typescript
// GET /api/attachments/:id
// 获取附件信息
interface GetAttachmentResponse {
  attachment: Attachment;
}

// GET /api/attachments/:id/preview
// 获取预览内容（HTML 或 PDF 二进制）
interface PreviewResponse {
  type: 'html' | 'pdf' | 'text';
  content: string;        // HTML 文本 / 文本内容
  url?: string;           // PDF 直接下载链接
}

// GET /api/attachments/:id/download
// 下载附件

// POST /api/attachments/:id/copy-link
// 复制链接（生成临时访问链接）
```

### 5.5 关键样式实现

```css
/* 附件预览页 */
.preview-page {
  background: var(--pbg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 水墨标题栏 */
.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--pbg);
}

.preview-header-info {
  flex: 1;
  min-width: 0;
}

.preview-file-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--pfg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-file-meta {
  font-size: 10px;
  color: var(--mut);
  margin-top: 2px;
}

/* 文档预览区 */
.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--doc-preview-bg);
}

/* PDF 容器 */
.pdf-container {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}

.pdf-page {
  width: 100%;
  display: block;
}

.pdf-page-indicator {
  text-align: center;
  padding: 8px;
  font-size: 11px;
  color: var(--mut);
  font-family: var(--font-num);
}

/* Word/txt 文档内容 */
.doc-content {
  background: white;
  padding: 24px;
  border-radius: 4px;
  min-height: 400px;
}

.doc-title {
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: var(--doc-title-size);
  color: var(--doc-text);
  margin-bottom: 8px;
}

.doc-subtitle {
  font-size: 11px;
  color: var(--mut);
  margin-bottom: 16px;
}

.doc-divider {
  height: 1px;
  background: var(--line);
  margin: 16px 0;
}

.doc-field-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  font-size: var(--doc-body-size);
  line-height: 1.6;
}

.doc-field-label {
  font-weight: 700;
  color: var(--doc-text);
  flex-shrink: 0;
  min-width: 48px;
}

.doc-field-value {
  color: var(--doc-text);
}

.doc-status {
  color: var(--acc);
  font-weight: 600;
}

/* 底部操作条 */
.preview-footer {
  padding: 12px 16px 24px;
  background: var(--pbg);
  border-top: 1px solid var(--line);
}

.tool-bar {
  display: flex;
  gap: 8px;
}

.tool-card {
  flex: 1;
  height: 54px;
  background: var(--tool-card-bg);
  border: 1px solid var(--tool-card-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.tool-card:active {
  background: var(--line);
}

.tool-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tool-icon-bg);
  border-radius: 8px;
}

.tool-label {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--pfg);
}

/* 录音预览特殊样式 */
.audio-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px;
}

.audio-waveform-large {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.audio-waveform-large .waveform-bar {
  width: 4px;
  background: var(--acc);
  border-radius: 2px;
  animation: eq 1.1s ease-in-out infinite alternate;
}

/* 夜间适配 */
.night .preview-body {
  background: var(--pbg);
}

.night .pdf-container,
.night .doc-content {
  background: var(--glass);
  border: 1px solid var(--gline);
}

.night .doc-title,
.night .doc-field-label,
.night .doc-field-value {
  color: var(--pfg);
}

.night .tool-card {
  background: var(--glass);
  border-color: var(--gline);
}

.night .tool-icon {
  background: rgba(255,255,255,0.08);
}
```

---

## 六、页面十一：分享导出（ShareExport）

> **路由**: `/share/:noteId`（Bottom Sheet 浮层形式）
> **定位**: 笔记分享与导出面板，支持长图/PDF/MD/分享链接
> **触发**: 详情页底部「分享」/ 列表左滑「享」

> **实现说明（2026-08-07）**：本页已落地为 `src/components/note/ShareSheet.tsx`（组件内嵌，非独立路由），由详情页底部「分享」按钮与更多操作「分享」触发（`app/note/[id].tsx` 的 `handleShare` 由直调 `expo-sharing` 改为打开该 Sheet）。能力在本地应用内映射：导出 Markdown/txt 用 `expo-file-system` 写入 `exports/` 目录再经 `expo-sharing` 分享；复制链接用 `expo-clipboard`（无后端，复制 `note-demo://note/{id}` 引用）；生成长图当前以分享正文文本代替（真长图合成待接入 Canvas/截图库）；PDF 暂导出为 txt 文本兜底。

### 6.1 页面结构（DOM 树）

```
ShareExport (Bottom Sheet 浮层)
├── Overlay (压暗背景层)
│   └── rgba(24,21,16,.44)（日）/ rgba(4,6,14,.55)（夜）
├── SheetContainer (浮层容器)
│   ├── DragHandle (拖拽指示器)
│   │   └── 36×4px 圆角条
│   ├── SheetHeader (浮层头部)
│   │   ├── SealBadge "享" (朱砂红底)
│   │   ├── Title "分享与导出"
│   │   └── Subtitle "将这篇笔记以你喜欢的方式传递出去"
│   ├── InkCardPreview (长图卡预览)
│   │   ├── CardBg
│   │   ├── CardTitle "季度评审会 · 立项汇报"
│   │   ├── CardSummary "确认 9/15 上线；安排演示；记录行动项与风险…"
│   │   └── CardMeta "note-demo · 2026年8月5日"
│   ├── GenerateLongImageButton (生成长图)
│   │   ├── Icon (长图)
│   │   └── Text "生成长图 · 保存到相册"
│   ├── ExportOptions (导出选项)
│   │   ├── ExportCard "导出 PDF"
│   │   │   ├── Icon (PDF)
│   │   │   └── Label "导出 PDF"
│   │   └── ExportCard "导出 Markdown"
│   │       ├── Icon (MD)
│   │       └── Label "导出 Markdown"
│   ├── ShareLinkSection (分享链接)
│   │   ├── LinkInput "note-demo.net/share/abc123..."
│   │   └── CopyButton "复制"
│   │       └── 深墨底白字胶囊按钮
│   └── (无系统分享区，已删除)
```

### 6.2 组件拆解

| 组件名 | 类型 | 复用/新增 | 说明 |
|--------|------|-----------|------|
| `ShareSheet` | 分子 | 复用 | Bottom Sheet 浮层，复用 sheetUp 动效 |
| `DragHandle` | 原子 | 复用 | 拖拽指示器 |
| `SealBadge` | 原子 | 复用 | 朱砂「享」印章 |
| `InkCardPreview` | 分子 | **新增** | 长图卡预览组件 |
| `GenerateLongImageButton` | 原子 | **新增** | 生成长图按钮 |
| `ExportCard` | 原子 | **新增** | 导出选项卡（PDF/MD） |
| `ShareLinkSection` | 分子 | **新增** | 分享链接+复制 |
| `CopyButton` | 原子 | **新增** | 复制按钮 |

### 6.3 状态与交互

#### 状态定义

```typescript
interface ShareExportState {
  note: Note | null;
  isLoading: boolean;
  shareLink: string | null;
  isGeneratingImage: boolean;
  isExportingPDF: boolean;
  isExportingMD: boolean;
  showToast: boolean;
  toastMessage: string;
}
```

#### 核心交互流程

```
1. 触发浮层
   ├─ 详情页点击「分享」/ 列表左滑「享」
   ├─ 背景压暗 + sheetUp 0.55s 滑入
   └─ 拉取笔记数据生成预览

2. 长图卡预览
   ├─ 显示水墨风卡片预览（标题+摘要+印章）
   ├─ 日：宣纸横版 / 夜：玻璃竖版（可选双主题）
   └─ 预览仅供参考，实际生成时重新渲染

3. 生成长图
   ├─ 点击「生成长图 · 保存到相册」
   ├─ 显示生成中 loading（研墨 loader）
   ├─ 使用 canvas 合成长图：
   │   ├─ 渲染标题（思源宋体 900）
   │   ├─ 渲染正文摘要
   │   ├─ 渲染元数据（日期/分类）
   │   ├─ 渲染朱砂印章
   │   └─ 注意中文字体嵌入（避免方块）
   ├─ 生成后调起系统保存到相册
   └─ 成功/失败 toast 提示

4. 导出 PDF
   ├─ 点击「导出 PDF」
   ├─ 后端生成 PDF / 前端 html2pdf
   ├─ 下载到本地
   └─ 进度提示

5. 导出 Markdown
   ├─ 点击「导出 Markdown」
   ├─ 将笔记内容转为 Markdown 格式
   ├─ 复制到剪贴板 / 下载 .md 文件
   └─ 成功提示

6. 分享链接
   ├─ 自动生成分享链接（含鉴权 token）
   ├─ 显示链接（可编辑时效/权限）
   ├─ 点击「复制」→ 复制到剪贴板
   └─ 显示「已复制」toast

7. 隐私选项（已移除）
   ├─ 原设计有「是否含 AI 分类标签」开关
   └─ 现已删除，AI 标签默认随分享附带

8. 关闭浮层
   ├─ 点击背景遮罩 → 向下滑出关闭
   ├─ 下拉拖拽 → 向下滑出关闭
   └─ 关闭后回到触发页面
```

### 6.4 数据结构

```typescript
// POST /api/notes/:id/share
// 生成分享链接
interface ShareLinkRequest {
  noteId: string;
  expiryDays?: number;   // 链接有效期（默认7天）
  scope?: 'public' | 'private'; // 公开/仅自己
}

interface ShareLinkResponse {
  shareUrl: string;
  expiresAt: string;
}

// POST /api/notes/:id/export
// 导出笔记
interface ExportRequest {
  noteId: string;
  format: 'pdf' | 'markdown' | 'image';
  includeTags?: boolean;
}

interface ExportResponse {
  downloadUrl: string;
  filename: string;
}

// POST /api/notes/:id/generate-image
// 生成长图
interface GenerateImageResponse {
  imageUrl: string;
  width: number;
  height: number;
}
```

### 6.5 关键样式实现

```css
/* 压暗背景 */
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 21, 16, 0.44);
  z-index: 100;
}

.night .share-overlay {
  background: rgba(4, 6, 14, 0.55);
}

/* Sheet 浮层 */
.share-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--sheet-bg);
  border-radius: 24px 24px 0 0;
  padding: 12px 16px 32px;
  max-height: 85vh;
  overflow-y: auto;
  z-index: 101;
  animation: sheetUp 0.55s cubic-bezier(.2,.8,.2,1);
}

.night .share-sheet {
  background: rgba(13, 17, 34, 0.93);
  backdrop-filter: blur(18px);
}

/* 拖拽条 */
.drag-handle {
  width: 36px;
  height: 4px;
  background: var(--line);
  border-radius: 2px;
  margin: 0 auto 16px;
}

.night .drag-handle {
  background: var(--gline);
}

/* Sheet 头部 */
.sheet-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.sheet-header-content {
  flex: 1;
}

.sheet-title {
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: 16px;
  color: var(--pfg);
}

.sheet-subtitle {
  font-size: 10px;
  color: var(--mut);
  margin-top: 2px;
}

/* 长图卡预览 */
.ink-card-preview {
  background: var(--inkcard-bg);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--line);
}

.ink-card-title {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 14px;
  color: var(--pfg);
  margin-bottom: 6px;
}

.ink-card-summary {
  font-size: 11px;
  color: var(--pfg);
  opacity: 0.8;
  line-height: 1.5;
  margin-bottom: 8px;
}

.ink-card-meta {
  font-size: 9px;
  color: var(--mut);
}

/* 生成长图按钮 */
.generate-image-btn {
  width: 100%;
  height: 44px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pfg);
  margin-bottom: 12px;
  cursor: pointer;
}

.generate-image-btn:active {
  background: rgba(229, 220, 200, 0.3);
}

/* 导出选项 */
.export-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.export-card {
  height: 70px;
  background: var(--card);
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.export-card-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tool-icon-bg);
  border-radius: 8px;
}

.export-card-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--pfg);
}

/* 分享链接区 */
.share-link-section {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--share-link-bg);
  border-radius: var(--radius-pill);
  padding: 4px 4px 4px 14px;
}

.share-link-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--mut);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  padding: 8px 16px;
  background: var(--copy-btn-bg);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}

.copy-btn:active {
  opacity: 0.9;
}

/* 夜间适配 */
.night .ink-card-preview {
  background: var(--glass);
  border-color: var(--gline);
}

.night .generate-image-btn {
  border-color: var(--gline);
  color: var(--pfg);
}

.night .export-card {
  background: var(--glass);
  border-color: var(--gline);
}

.night .export-card-icon {
  background: rgba(255,255,255,0.08);
}

.night .share-link-section {
  background: rgba(255,255,255,0.05);
}

.night .copy-btn {
  background: var(--grd);
  color: var(--pbg);
}
```

---

## 七、全局状态扩展

### 7.1 Zustand Store 补充

```typescript
// stores/useAppStore.ts — 补充字段
interface AppState {
  // === 前序已有 ===
  // theme, notes, searchHistory, audioPlayer, settings, todos...

  // === 本次补充 ===

  // 日历数据
  calendarCache: Map<string, CalendarNotesResponse>; // key: "YYYY-MM"
  setCalendarCache: (key: string, data: CalendarNotesResponse) => void;

  // 图库数据
  galleryCache: Map<string, GalleryResponse>; // key: "category-page"
  setGalleryCache: (key: string, data: GalleryResponse) => void;

  // 当前预览附件
  currentAttachment: Attachment | null;
  setCurrentAttachment: (att: Attachment | null) => void;

  // 分享状态
  shareState: {
    isOpen: boolean;
    noteId: string | null;
  };
  openShareSheet: (noteId: string) => void;
  closeShareSheet: () => void;
}
```

---

## 八、API 接口扩展

### 8.1 日历相关

```typescript
// GET /api/notes/calendar?year=2026&month=7
// 获取日历视图笔记分布
```

### 8.2 图库相关

```typescript
// GET /api/gallery?category=all&page=1&pageSize=20
// 获取图库内容

// GET /api/notes/:id/image?size=original
// 获取笔记大图
```

### 8.3 附件相关

```typescript
// GET /api/attachments/:id
// 获取附件信息

// GET /api/attachments/:id/preview
// 获取预览内容

// GET /api/attachments/:id/download
// 下载附件

// POST /api/attachments/:id/copy-link
// 生成临时访问链接
```

### 8.4 分享导出相关

```typescript
// POST /api/notes/:id/share
// 生成分享链接

// POST /api/notes/:id/export
// 导出笔记

// POST /api/notes/:id/generate-image
// 生成长图（Canvas 合成）
```

---

## 九、组件库拆分清单（补充）

### 9.1 原子组件（补充）

| 组件 | 来源 | 说明 |
|------|------|------|
| `TodayDot` | **新增** | 今日朱砂圆点描边 |
| `InkDot` | **新增** | 单枚墨点 |
| `DiamondNode` | **新增** | 菱形节点（日期题头） |
| `OCRBadge` | **新增** | OCR 文字角标 |
| `VideoPlayBtn` | **新增** | 视频播放标记 |
| `ToolCard` | **新增** | 底部工具卡 |
| `PageIndicator` | **新增** | PDF 页码指示器 |
| `CopyButton` | **新增** | 复制按钮 |

### 9.2 分子组件（补充）

| 组件 | 来源 | 说明 |
|------|------|------|
| `MonthNav` | **新增** | 月切换导航 |
| `CalendarCell` | **新增** | 日历单格 |
| `InkDots` | **新增** | 墨点密度渲染 |
| `DayRoll` | **新增** | 当日长卷展开区 |
| `YearGroup` | **新增** | 年月可折叠分组 |
| `MasonryGrid` | **新增** | 双栏瀑布流容器 |
| `GalleryCard` | **新增** | 图库卡片基类 |
| `ImageCard` | **新增** | 图片卡片 |
| `VideoCard` | **新增** | 视频卡片 |
| `AbstractCard` | **新增** | 无图笔记卡片 |
| `FailCard` | **新增** | 加载失败占位 |
| `PDFRenderer` | **新增** | pdf.js 封装 |
| `DocumentViewer` | **新增** | 文档渲染路由 |
| `InkCardPreview` | **新增** | 长图卡预览 |
| `ShareLinkSection` | **新增** | 分享链接区 |

---

## 十、开发排期与里程碑

### 10.1 开发阶段

| 阶段 | 周期 | 任务 | 产出 |
|------|------|------|------|
| **W1** | 3d | 日历视图开发 | 月历网格 + 墨点密度 + 当日长卷 |
| **W1** | 2d | 图库视图开发 | 瀑布流 + 分类筛选 + 年月分组 |
| **W2** | 3d | 附件预览开发 | PDF/Word/txt 渲染 + 底部工具条 |
| **W2** | 2d | 分享导出开发 | Bottom Sheet + 长图生成 + 导出 |
| **W3** | 3d | 联调 + 双主题适配 + 动效 | 四页完整 + 夜间模式 |
| **W3** | 2d | 测试 + 性能优化 | 可交付版本 |

### 10.2 里程碑

- **M1（W1 结束）**: 日历视图可浏览月历、查看每日笔记密度、展开当日长卷
- **M2（W2 结束）**: 图库视图可瀑布流浏览、附件可预览 PDF/Word、分享导出可用
- **M3（W3 结束）**: 双主题完整适配，动效落地，测试通过

---

## 十一、性能与无障碍要求

### 11.1 性能指标

| 指标 | 目标 | 措施 |
|------|------|------|
| 日历月切换 | < 200ms | 本地缓存月份数据 |
| 图库首屏 | < 1s | 缩略图懒加载 + 分页 |
| PDF 渲染 | < 500ms | pdf.js worker 异步 |
| 长图生成 | < 2s | Canvas 离屏渲染 |
| 瀑布流滚动 | 60fps | Intersection Observer 懒加载 |

### 11.2 无障碍要求

- [ ] 日历格配 `role="grid"` + `aria-selected`
- [ ] 墨点密度配 `aria-label="{count}条笔记"`
- [ ] 图库卡片配 `role="img"` + `aria-label`
- [ ] PDF 翻页配 `aria-live="polite"` 朗读页码
- [ ] 底部工具条按钮配 `aria-label`
- [ ] 分享 Sheet 打开时焦点锁定，关闭时回到触发按钮
- [ ] 加载失败占位配 `role="button"` + 重试提示

### 11.3 多端适配

| 场景 | 适配策略 |
|------|----------|
| 日历周起始 | 根据 locale 设置周一/周日起始 |
| PDF 渲染 | iOS Safari 使用 pdf.js + canvas / Android 同样 |
| 视频播放 | iOS 使用原生 AVPlayer / Android 使用 ExoPlayer |
| 保存到相册 | iOS UIImageWriteToSavedPhotosAlbum / Android MediaStore |
| 系统分享 | 调起原生 Share Sheet（iOS UIActivityViewController / Android Intent） |

---

## 附录：截图与已有设计文档对照索引

| 截图 | 页面 | 已有文档章节 | 本文档章节 |
|------|------|-------------|-----------|
| P7-日历-日间.png | 日历视图 | §12.1 页面 07 日历视图 | §3 页面七：日历视图 |
| P8-图库-日间.png | 图库视图 | §12.2 页面 08 图库视图 | §4 页面八：图库视图 |
| P10-附件-日间.png | 附件预览 | §12.4 页面 10 附件预览 | §5 页面十：附件预览 |
| P11-分享-日间.png | 分享导出 | §12.5 页面 11 分享导出 | §6 页面十一：分享导出 |

---

*本文档与前序两份《note-demo-开发实施方案》互为补充，合起来覆盖 P0+P1 全部 10 个页面。所有组件、样式、状态、接口均已细化到可直接编码的粒度。*
