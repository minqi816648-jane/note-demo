import React from 'react';

/**
 * note-demo 主题化图标组件
 * 规范：24×24 网格 · 1.75px 描边 · round 端点
 * 主题：日 焦墨#1C1B18 / 夜 雾白#F2F4FF（由 CSS color 继承）；选中强调 朱砂/极光青
 * 用法：<NoteIcon name="note" size={24} />
 */
export type NoteIconName = 'note' | 'ai' | 'plus' | 'todo' | 'gear' | 'search' | 'cal' | 'grid' | 'img' | 'link' | 'sort' | 'mic' | 'star' | 'brush' | 'clip' | 'more' | 'close' | 'left' | 'check' | 'send' | 'stop' | 'todoadd' | 'briefcase' | 'book' | 'house' | 'bulb' | 'folder' | 'tag' | 'list' | 'theme' | 'shield' | 'globe' | 'bell' | 'database' | 'sync' | 'user' | 'info' | 'trash' | 'download' | 'help' | 'logout' | 'lock' | 'font';

const ICON_PATHS: Record<string, React.ReactNode> = {
  'i-note': (
    <>
      <path d="M6 3.5h9.5L19 7v13.5H6z" /><path d="M15 3.5V7h4" /><path d="M9 11.5h6M9 15h6M9 8h3" />
    </>
  ),
  'i-ai': (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  'i-plus': (
    <>
      <path d="M12 5.5v13M5.5 12h13" />
    </>
  ),
  'i-todo': (
    <>
      <path d="M4 6.5h3M4 12h3M4 17.5h3" /><path d="M10.5 6.5H20M10.5 12H20" /><path d="M10.5 17.5H16" />
    </>
  ),
  'i-gear': (
    <>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2.1" /><circle cx="8" cy="16" r="2.1" />
    </>
  ),
  'i-search': (
    <>
      <circle cx="11" cy="11" r="6.5" /><path d="M16.4 16.4l4 4" />
    </>
  ),
  'i-cal': (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 2.8v4M16 2.8v4" /><path d="M7.5 13.5h1M11.5 13.5h1M15.5 13.5h1" />
    </>
  ),
  'i-grid': (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.8" /><rect x="13" y="4" width="7" height="7" rx="1.8" /><rect x="4" y="13" width="7" height="7" rx="1.8" /><rect x="13" y="13" width="7" height="7" rx="1.8" />
    </>
  ),
  'i-img': (
    <>
      <rect x="3.8" y="5" width="16.4" height="14" rx="2.4" /><circle cx="9" cy="10" r="1.7" /><path d="M5.5 16.5l4.2-4 3.2 3 3-2.4 2.6 3.4" />
    </>
  ),
  'i-link': (
    <>
      <path d="M10 14.5l4-4" /><path d="M8.5 12l-2.5 2.5a3.5 3.5 0 0 0 5 5L13 17.5M15.5 12l2.5-2.5a3.5 3.5 0 0 0-5-5L11 6.5" />
    </>
  ),
  'i-sort': (
    <>
      <path d="M4 7h10M4 12h7M4 17h5" /><path d="M15 9l3-3 3 3M18 6v12" />
    </>
  ),
  'i-mic': (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18.5v3" />
    </>
  ),
  'i-star': (
    <>
      <path d="M12 3.5l2.5 5.2 5.7.7-4.2 4 1.1 5.7L12 16.3l-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z" />
    </>
  ),
  'i-brush': (
    <>
      <path d="M4 20c.5-3 1.5-4.5 3-6L16.5 4.5a2.1 2.1 0 0 1 3 3L10 17c-1.5 1.5-3 2.5-6 3z" /><path d="M14.5 6.5l3 3" />
    </>
  ),
  'i-clip': (
    <>
      <path d="M9 12.5l6.2-6.2a3.3 3.3 0 0 1 4.6 4.6l-8 8a5 5 0 0 1-7.1-7.1l8.5-8.5" /><path d="M9.2 12.5l4-4" />
    </>
  ),
  'i-more': (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  'i-close': (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  'i-left': (
    <>
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </>
  ),
  'i-check': (
    <>
      <path d="M4.5 12.5l5 5L19.5 6.5" />
    </>
  ),
  'i-send': (
    <>
      <path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" />
    </>
  ),
  'i-stop': (
    <>
      <rect x="8" y="8" width="8" height="8" rx="1.8" />
    </>
  ),
  'i-todoadd': (
    <>
      <path d="M9.5 5.5L11 7l3-3M4 12h4M4 18h4" /><path d="M11 12h9M11 18h9" />
    </>
  ),
  'i-briefcase': (
    <>
      <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" /><path d="M9 7V5.8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V7" /><path d="M3.5 12.5h17" />
    </>
  ),
  'i-book': (
    <>
      <path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H12v15.5H6.2A2.2 2.2 0 0 0 4 20.7z" /><path d="M20 5.2A2.2 2.2 0 0 0 17.8 3H12v15.5h5.8A2.2 2.2 0 0 1 20 20.7z" /><path d="M12 3v15.5" />
    </>
  ),
  'i-house': (
    <>
      <path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" />
    </>
  ),
  'i-bulb': (
    <>
      <path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.6 1.4 1.6 2.2h4c0-.8.8-1.6 1.6-2.2A6 6 0 0 0 12 3z" />
    </>
  ),
  'i-folder': (
    <>
      <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </>
  ),
  'i-tag': (
    <>
      <path d="M3.5 3.5v6.9l9.3 9.3a2 2 0 0 0 2.8 0l4.1-4.1a2 2 0 0 0 0-2.8l-9.3-9.3z" /><circle cx="7.5" cy="7.5" r="1.4" />
    </>
  ),
  'i-list': (
    <>
      <path d="M8.5 6H20M8.5 12H20M8.5 18H20" /><path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  'i-theme': (
    <>
      <circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" />
    </>
  ),
  'i-shield': (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" />
    </>
  ),
  'i-globe': (
    <>
      <circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5-3.8-8.5s1.3-6.2 3.8-8.5z" />
    </>
  ),
  'i-bell': (
    <>
      <path d="M6 16.5v-5a6 6 0 0 1 12 0v5l1.5 2.5h-15z" /><path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  'i-database': (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.7" /><path d="M4.5 5.5v7c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-7" /><path d="M4.5 12.5v4c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-4" />
    </>
  ),
  'i-sync': (
    <>
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 12" /><path d="M4 12a8 8 0 0 1 13.7-5.6L20 12" /><path d="M4 8v4h4M20 16v-4h-4" />
    </>
  ),
  'i-user': (
    <>
      <circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  'i-info': (
    <>
      <circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.5h.01" />
    </>
  ),
  'i-trash': (
    <>
      <path d="M5 7h14M10 7V5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7" /><path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" /><path d="M10 11v6M14 11v6" />
    </>
  ),
  'i-download': (
    <>
      <path d="M12 4v10M7.5 10.5L12 15l4.5-4.5" /><path d="M5 19.5h14" />
    </>
  ),
  'i-help': (
    <>
      <circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.2a2.5 2.5 0 0 1 4.8 1c0 1.6-2.3 2-2.3 3.3" /><path d="M12 17h.01" />
    </>
  ),
  'i-logout': (
    <>
      <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" /><path d="M11 12h9M16.5 8.5L20 12l-3.5 3.5" />
    </>
  ),
  'i-lock': (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14.5v2" />
    </>
  ),
  'i-font': (
    <>
      <path d="M4 18.5L10 5.5l6 13M7 13h6" /><path d="M16.5 11.5h3M18 10v8" />
    </>
  )
};

interface Props {
  name: NoteIconName;
  size?: number;
  className?: string;
  filled?: boolean; // i-more 等实心图标需传 true
  title?: string;
}

export default function NoteIcon({ name, size = 24, className, filled, title }: Props) {
  const id = 'i-' + name;
  const node = ICON_PATHS[id];
  if (!node) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? undefined : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {node}
    </svg>
  );
}
