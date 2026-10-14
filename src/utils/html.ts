// ============================================
// HTML 内容处理工具
// ============================================

/**
 * 从 HTML 内容中提取纯文本
 * 用于搜索索引和卡片预览
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  // 移除 script 和 style 标签
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 替换换行标签
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n');

  // 移除所有 HTML 标签
  text = text.replace(/<[^>]+>/g, '');

  // 解码常见 HTML 实体
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'");

  // 合并多个空格和空行
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');

  // 清理首尾空白
  return text.trim();
}

// ============ 富文本 HTML 消毒（对抗性安全） ============

// 内联事件处理器属性（onclick/onerror/onload/...）
const EVENT_ATTR = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// style 里也可藏 url()/expression() 破坏，这里做基础净化（保留内联 style，但去掉 expression() 与 javascript:）
const DANGEROUS_STYLE = /(expression\s*\(|javascript\s*:\s*)/gi;

/**
 * 清洗富文本 HTML，用于写入编辑器/WebView 前消毒，阻断存储型 XSS。
 * 剔除：script/iframe/object/embed 等活动标签、on* 事件属性、`javascript:` 协议。
 * 保留：文本、段落、图片、链接、媒体卡片(.nk-card)等静态排版内容。
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  let out = html;

  // 1) 剔除活动元素整体（含内容），如 <script>...</script>
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<(\/)?(iframe|object|embed|frame|noscript|svg|math|form|link|meta|base)[^>]*>/gi, (m, slash) =>
    slash ? '' : `<!-- sanitized:${m} -->`
  );

  // 2) 移除所有事件处理属性 onxxx="..."
  out = out.replace(EVENT_ATTR, '');

  // 3) 危险 style 内容
  out = out.replace(DANGEROUS_STYLE, '');

  // 4) javascript: 协议（href/src 里的）→ 替换为无操作
  out = out.replace(/\b(javascript)\s*:/gi, 'disabled:');

  return out;
}

/**
 * 检测文本中的链接
 * 返回 links 数组
 */
export function extractLinks(text: string): string[] {
  if (!text) return [];

  // URL 正则表达式
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = text.match(urlRegex) || [];

  // 去重
  return [...new Set(matches)];
}

/**
 * 从文本中截取摘要
 */
export function extractSummary(text: string, maxLength: number = 100): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}