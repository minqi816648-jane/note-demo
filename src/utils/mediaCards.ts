import type { ThemeColors } from '../constants/colors';

// ============================================
// 多媒体插入卡片块（对照 A–E）
// 卡片以 .nk-card HTML 块序列化到 note.content，在编辑器/详情页 WebView 内经 CSS 渲染
// —— 见《note-demo-开发沟通文档4.0》6.2
// ============================================

export type MediaKind = 'image' | 'link' | 'file' | 'audio';

export interface MediaCardStats {
  image: number;
  link: number;
  file: number;
  audio: number;
  total: number;
}

/** HTML 字符串转义 */
function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * URL 协议白名单（对抗性安全）。
 * - 图片/附件：允许 file:（本地附件）与 http(s):，拒绝 javascript:/data: 等。
 * - 链接：仅允许 http(s):。
 * 不匹配时返回 null（由调用方回退为空/去协议字符串）。
 */
export function safeUrl(value: string, opts: { allowFile?: boolean } = {}): string | null {
  const s = String(value || '').trim();
  if (!s) return value;
  const lower = s.toLowerCase();
  if (/^(https?):\/\//i.test(s)) return s;
  if (opts.allowFile && lower.startsWith('file://')) return s;
  return null;
}

/** 链接仅在 http(s) 下可用，否则视为空 */
export function safeLinkUrl(value: string): string {
  const s = safeUrl(value, { allowFile: false });
  return s ?? '';
}

/** 生成卡片标题文案（图签） */
export function cardLabel(kind: MediaKind, index: number): string {
  const map: Record<MediaKind, string> = {
    image: '图片',
    link: '链接',
    file: '附件',
    audio: '录音',
  };
  return `${map[kind]} ${index} · 已插入`;
}

/**
 * 构建卡片 HTML 块（figure 块级，前后带换行占位）
 */
export function buildMediaCardHtml(kind: MediaKind, data: Record<string, string>, index: number): string {
  let inner = '';

  if (kind === 'image') {
    const src = safeUrl(data.src || '', { allowFile: true }) ?? '';
    inner = `<img src="${esc(src)}" />`;
  } else if (kind === 'link') {
    const url = safeLinkUrl(data.url || '');
    let host = url;
    try {
      host = new URL(url).host;
    } catch {
      host = url;
    }
    inner =
      `<div class="nk-link"><div class="nk-link-host">${esc(host)}</div>` +
      `<div class="nk-link-url">${esc(url)}</div></div>`;
  } else if (kind === 'file') {
    inner =
      `<div class="nk-file"><span class="nk-file-ico">PDF</span>` +
      `<span class="nk-file-name">${esc(data.title || data.fileName || '附件')}</span>` +
      `<span class="nk-file-size">${esc(data.sizeText || '')}</span></div>`;
  } else if (kind === 'audio') {
    inner =
      `<div class="nk-audio"><span class="nk-audio-play">▶</span>` +
      `<span class="nk-audio-label">${esc(data.title || '语音')}</span>` +
      `<span class="nk-audio-meta">${esc(data.durationText || '')}</span></div>`;
  }

  const kindAttrs = [`data-kind="${kind}"`, `data-index="${index}"`];
  if (kind === 'image' && data.src) kindAttrs.push(`data-src="${esc(safeUrl(data.src, { allowFile: true }) ?? '')}"`);
  if (kind === 'link' && data.url) kindAttrs.push(`data-url="${esc(safeLinkUrl(data.url))}"`);
  if (kind === 'file' && data.attId) kindAttrs.push(`data-attachment="${esc(data.attId)}"`);
  if (kind === 'audio' && data.attId) kindAttrs.push(`data-attachment="${esc(data.attId)}"`);

  return `<br/><figure class="nk-card" ${kindAttrs.join(' ')}>${inner}<figcaption>${esc(cardLabel(kind, index))}</figcaption></figure><br/>`;
}

/** 统计 content 中的卡片数量 */
export function countMediaBlocks(html: string): MediaCardStats {
  const stats: MediaCardStats = { image: 0, link: 0, file: 0, audio: 0, total: 0 };
  const re = /<figure\b[^>]*\bdata-kind="(image|link|file|audio)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const kind = m[1] as MediaKind;
    stats[kind] += 1;
    stats.total += 1;
  }
  return stats;
}

/** 解析所有卡片块的 data 属性（kind 与 data-*），供详情页去重与交互 */
export function parseMediaCards(html: string): Array<{ kind: MediaKind; data: Record<string, string> }> {
  const out: Array<{ kind: MediaKind; data: Record<string, string> }> = [];
  const re = /<figure\b[^>]*\bdata-kind="(image|link|file|audio)"([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const kind = m[1] as MediaKind;
    const attrBlock = m[2] || '';
    const data: Record<string, string> = {};
    const attrRe = /([\w-]+)="([^"]*)"/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrBlock)) !== null) {
      const name = am[1];
      if (name === 'class' || name === 'data-kind' || name === 'data-index') continue;
      data[name.replace(/^data-/, '')] = am[2];
    }
    out.push({ kind, data });
  }
  return out;
}

/**
 * 生成 .nk-card 渲染 CSS（日/夜共用，主色注入）
 */
export function buildMediaCardCss(colors: ThemeColors, isDark: boolean): string {
  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : '#FFFDF7';
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : '#E5DCC8';
  const text = colors.textPrimary;
  const mut = colors.textSecondary;
  const accent = colors.primary;

  return `
    figure.nk-card {
      display: block;
      margin: 14px 0;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid ${cardBorder};
      background: ${cardBg};
      box-sizing: border-box;
    }
    figure.nk-card img {
      display: block;
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    figure.nk-card figcaption {
      margin-top: 8px;
      font-size: 12px;
      color: ${mut};
    }
    .nk-link-host { font-weight: 700; font-size: 15px; color: ${text}; }
    .nk-link-url { font-size: 12px; color: ${mut}; word-break: break-all; margin-top: 2px; }
    .nk-file, .nk-audio { display: flex; align-items: center; }
    .nk-file-ico {
      flex-shrink: 0;
      font-size: 11px; font-weight: 800;
      color: #FFF; background: ${accent};
      border-radius: 6px; padding: 4px 6px; margin-right: 8px;
    }
    .nk-file-name, .nk-audio-label {
      flex: 1; font-size: 15px; color: ${text};
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .nk-file-size, .nk-audio-meta { font-size: 12px; color: ${mut}; margin-left: 8px; }
    .nk-audio { color: ${text}; }
    .nk-audio-play {
      flex-shrink: 0;
      width: 34px; height: 34px; border-radius: 17px;
      background: ${accent}; color: #FFF;
      font-size: 14px; text-align: center; line-height: 34px;
      margin-right: 10px;
    }
    @media (prefers-reduced-motion: reduce) {
      figure.nk-card { transition: none; }
    }
  `;
}

/** 卡片图签集合文案（组合统计） */
export function mediaStatsLabel(stats: MediaCardStats): string {
  const parts: string[] = [];
  if (stats.image > 0) parts.push(`图片${stats.image}`);
  if (stats.link > 0) parts.push(`链接${stats.link}`);
  if (stats.audio > 0) parts.push(`录音${stats.audio}`);
  if (stats.file > 0) parts.push(`附件${stats.file}`);
  return parts.join(' · ');
}
