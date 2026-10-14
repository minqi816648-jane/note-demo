// ============================================
// 日期时间工具
// ============================================

/**
 * 获取当前时间的 ISO 8601 格式字符串
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 格式化日期为友好显示
 * 规则：
 * - 今天: 显示时间 (14:30)
 * - 昨天: 显示 '昨天'
 * - 7天内: 显示星期几
 * - 今年: 显示月/日 (3月15日)
 * - 更早: 显示年/月/日 (2024/3/15)
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 今天
  if (diffDays === 0) {
    return formatTime(date);
  }
  
  // 昨天
  if (diffDays === 1) {
    return '昨天';
  }
  
  // 7天内
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
  
  // 今年
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  
  // 更早
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 格式化时间为 HH:mm
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化完整日期时间
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
}

/**
 * 相对时间（用于 AI 对话等场景）
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;
  
  return formatDate(dateStr);
}

/**
 * 按日分组的标题（每日长卷用）
 * 今日 / 昨日 / 其余为「M月D日」
 */
export function formatDayGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startTarget) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 按日期对笔记分组，返回按日期降序的组数组（每日长卷用）。
 * 支持排序字段：updated_at（最近更新）/ created_at（创建时间）/ title（标题）。
 * 日期分组键跟随所选时间字段（title 时沿用 updated_at 分组）。
 */
export interface DayGroupOptions {
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export function groupNotesByDay<T extends { id: string; updated_at: string; created_at?: string; title?: string }>(
  items: T[],
  options: DayGroupOptions = {}
): T[][] {
  const sortBy = options.sortBy || 'updated_at';
  const sortOrder = options.sortOrder || 'desc';
  const dateField = sortBy === 'created_at' ? 'created_at' : 'updated_at';

  const map = new Map<string, T[]>();
  for (const item of items) {
    const dateVal = (item as any)[dateField] || item.updated_at;
    const key = dateVal ? dateVal.slice(0, 10) : 'none';
    const list = map.get(key);
    if (list) {
      list.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  const groups = [...map.values()];
  groups.forEach((g) => {
    if (sortBy === 'title') {
      // §6.4「标题」：仅在各日组内按标题重排（localeCompare），不拆分日期分组
      g.sort((a, b) => {
        const va = (a.title || '').toLowerCase();
        const vb = (b.title || '').toLowerCase();
        const cmp = va.localeCompare(vb, 'zh-Hans-CN');
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    } else {
      g.sort((a, b) => {
        let va = (a as any)[sortBy];
        let vb = (b as any)[sortBy];
        if (va == null) va = '';
        if (vb == null) vb = '';
        const cmp = String(va) < String(vb) ? -1 : String(va) > String(vb) ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
  });
  // 组间按所选时间字段降序（组头日期）
  groups.sort((a, b) => {
    const ka = (a[0] as any)?.[dateField] || a[0]?.updated_at || '';
    const kb = (b[0] as any)?.[dateField] || b[0]?.updated_at || '';
    return ka > kb ? -1 : ka < kb ? 1 : 0;
  });
  return groups;
}
