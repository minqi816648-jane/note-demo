// ============================================
// 链接元信息抓取
// 拉取页面 HTML 解析 og 标题/描述/图标（无后端时的轻量实现）
// ============================================

export interface LinkMeta {
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  host: string;
}

const FETCH_TIMEOUT = 8000;

// 保留/内网/元数据地址段，禁止抓取（SSRF 防护）
const BLOCKED_HOST_RE =
  /(^|\.)(local|localhost|internal|intranet|lan|consul|corp|home\.arpa)$/i;
const BLOCKED_IP =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.0\.0\.0|::1$|fe80:)/;

/**
 * 校验待抓取 URL 是否符合协议/网络白名单。
 * 返回 null 表示通过；否则返回拒绝原因。
 */
export function validateExternalUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return 'URL 格式无效';
  }
  // 仅允许 http/https，拒绝 file://、content://、javascript: 等
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return '仅支持 http/https 链接';
  }
  const host = url.hostname;
  if (BLOCKED_HOST_RE.test(host) || BLOCKED_IP.test(host)) {
    return '不允许访问本地/内网地址';
  }
  return null;
}

/**
 * 尝试抓取链接标题、描述、favicon。
 * 失败时返回基于 host 的兜底标题。
 */
export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  const host = hostOf(url);
  const denied = validateExternalUrl(url);
  if (denied) {
    // 拒绝本地/内网/非 http(s)：不发起请求，仅返回兜底
    return { url, title: host || url, description: null, favicon_url: null, host };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 note-demo' },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const title =
      extractMeta(text, 'og:title') ||
      extractMeta(text, 'twitter:title') ||
      extractHtmlTitle(text);
    const description =
      extractMeta(text, 'og:description') ||
      extractMeta(text, 'description') ||
      extractMeta(text, 'twitter:description');
    const favicon =
      extractMeta(text, 'og:image') ||
      extractIcon(text, 'icon') ||
      (host ? `https://${host}/favicon.ico` : null);

    return {
      url,
      title: title?.slice(0, 120) || host || url,
      description: description ? description.slice(0, 300) : null,
      favicon_url: favicon,
      host,
    };
  } catch {
    return { url, title: host || url, description: null, favicon_url: null, host };
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * 根据 URL 的 host 简单分类：github / shopping / cloud / video / other
 */
export function categorizeUrl(url: string): string {
  const host = hostOf(url).toLowerCase();
  if (!host) return 'other';
  if (host.includes('github') || host.includes('gitlab') || host.includes('gitee')) return 'github';
  if (
    host.includes('taobao') || host.includes('tmall') || host.includes('jd.com') ||
    host.includes('amazon') || host.includes('ebay') || host.includes('pinduoduo') ||
    host.includes('1688') || host.includes('walmart')
  ) {
    return 'shopping';
  }
  if (host.includes('pan.baidu') || host.includes('alipan') || host.includes('quark') || host.includes('lanzou')) return 'cloud';
  if (host.includes('youtube') || host.includes('bilibili') || host.includes('youku') || host.includes('iqiyi') || host.includes('vimeo')) return 'video';
  return 'other';
}

function extractMeta(html: string, name: string): string | null {
  // property/content 或 name/content
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeEntities(m[1]);
  }
  return null;
}

function extractHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
}

function extractIcon(html: string, rel: string): string | null {
  const m = html.match(new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']+)["']`, 'i')) ||
            html.match(new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${rel}[^"']*["']`, 'i'));
  return m ? m[1] : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}
