import React from 'react';
import { Svg, Path, Circle, Rect, Ellipse } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
import { useTheme } from '../../theme';

/**
 * note-demo 主题化图标组件（RN 版，react-native-svg）
 * 规范：24×24 网格 · 1.75px 描边 · round 端点 —— docs/slog/图标库-清单与设计规范.md
 * 主题：日 焦墨#1C1B18 / 夜 雾白#F2F4FF（常规）；强调 朱砂/极光青（选中态传 color）
 * 用法：<NoteIcon name="note" size={24} />
 */
export type NoteIconName =
  | 'note' | 'ai' | 'plus' | 'todo' | 'gear' | 'search' | 'cal' | 'grid' | 'img' | 'link'
  | 'sort' | 'mic' | 'star' | 'brush' | 'clip' | 'more' | 'close' | 'left' | 'check' | 'send'
  | 'stop' | 'todoadd' | 'briefcase' | 'book' | 'house' | 'bulb' | 'folder' | 'tag' | 'list'
  | 'theme' | 'shield' | 'globe' | 'bell' | 'database' | 'sync' | 'user' | 'info' | 'trash'
  | 'download' | 'help' | 'logout' | 'lock' | 'font' | 'edit' | 'share' | 'archive' | 'quill';

/** 日用焦墨 / 夜用雾白 */
export function noteIconInk(isDark: boolean): string {
  return isDark ? '#F2F4FF' : '#1C1B18';
}
/** 强调色：日朱砂 / 夜极光青 */
export function noteIconAccent(isDark: boolean): string {
  return isDark ? '#8FE7F5' : '#B83A2A';
}

type Shape =
  | { t: 'path'; d: string; fill?: string }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: string }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

const ICON_SHAPES: Record<string, Shape[]> = {
  note: [
    { t: 'path', d: 'M6 3.5h9.5L19 7v13.5H6z' },
    { t: 'path', d: 'M15 3.5V7h4' },
    { t: 'path', d: 'M9 11.5h6M9 15h6M9 8h3' },
  ],
  ai: [
    { t: 'path', d: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z' },
    { t: 'path', d: 'M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z' },
  ],
  plus: [{ t: 'path', d: 'M12 5.5v13M5.5 12h13' }],
  todo: [
    { t: 'path', d: 'M4 6.5h3M4 12h3M4 17.5h3' },
    { t: 'path', d: 'M10.5 6.5H20M10.5 12H20' },
    { t: 'path', d: 'M10.5 17.5H16' },
  ],
  gear: [
    { t: 'path', d: 'M4 8h10M18 8h2M4 16h2M10 16h10' },
    { t: 'circle', cx: 16, cy: 8, r: 2.1 },
    { t: 'circle', cx: 8, cy: 16, r: 2.1 },
  ],
  search: [
    { t: 'circle', cx: 11, cy: 11, r: 6.5 },
    { t: 'path', d: 'M16.4 16.4l4 4' },
  ],
  cal: [
    { t: 'rect', x: 3.5, y: 5, w: 17, h: 15, rx: 2.5 },
    { t: 'path', d: 'M3.5 9.5h17M8 2.8v4M16 2.8v4' },
    { t: 'path', d: 'M7.5 13.5h1M11.5 13.5h1M15.5 13.5h1' },
  ],
  grid: [
    { t: 'rect', x: 4, y: 4, w: 7, h: 7, rx: 1.8 },
    { t: 'rect', x: 13, y: 4, w: 7, h: 7, rx: 1.8 },
    { t: 'rect', x: 4, y: 13, w: 7, h: 7, rx: 1.8 },
    { t: 'rect', x: 13, y: 13, w: 7, h: 7, rx: 1.8 },
  ],
  img: [
    { t: 'rect', x: 3.8, y: 5, w: 16.4, h: 14, rx: 2.4 },
    { t: 'circle', cx: 9, cy: 10, r: 1.7 },
    { t: 'path', d: 'M5.5 16.5l4.2-4 3.2 3 3-2.4 2.6 3.4' },
  ],
  link: [
    { t: 'path', d: 'M10 14.5l4-4' },
    { t: 'path', d: 'M8.5 12l-2.5 2.5a3.5 3.5 0 0 0 5 5L13 17.5M15.5 12l2.5-2.5a3.5 3.5 0 0 0-5-5L11 6.5' },
  ],
  sort: [
    { t: 'path', d: 'M4 7h10M4 12h7M4 17h5' },
    { t: 'path', d: 'M15 9l3-3 3 3M18 6v12' },
  ],
  mic: [
    { t: 'rect', x: 9, y: 3, w: 6, h: 11, rx: 3 },
    { t: 'path', d: 'M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18.5v3' },
  ],
  star: [{ t: 'path', d: 'M12 3.5l2.5 5.2 5.7.7-4.2 4 1.1 5.7L12 16.3l-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z' }],
  brush: [
    { t: 'path', d: 'M4 20c.5-3 1.5-4.5 3-6L16.5 4.5a2.1 2.1 0 0 1 3 3L10 17c-1.5 1.5-3 2.5-6 3z' },
    { t: 'path', d: 'M14.5 6.5l3 3' },
  ],
  clip: [
    { t: 'path', d: 'M9 12.5l6.2-6.2a3.3 3.3 0 0 1 4.6 4.6l-8 8a5 5 0 0 1-7.1-7.1l8.5-8.5' },
    { t: 'path', d: 'M9.2 12.5l4-4' },
  ],
  more: [
    { t: 'circle', cx: 5, cy: 12, r: 1.6, fill: 'solid' },
    { t: 'circle', cx: 12, cy: 12, r: 1.6, fill: 'solid' },
    { t: 'circle', cx: 19, cy: 12, r: 1.6, fill: 'solid' },
  ],
  close: [{ t: 'path', d: 'M6 6l12 12M18 6L6 18' }],
  left: [{ t: 'path', d: 'M14.5 5.5L8 12l6.5 6.5' }],
  check: [{ t: 'path', d: 'M4.5 12.5l5 5L19.5 6.5' }],
  send: [{ t: 'path', d: 'M12 19V6M6.5 11.5L12 6l5.5 5.5' }],
  stop: [{ t: 'rect', x: 8, y: 8, w: 8, h: 8, rx: 1.8 }],
  todoadd: [
    { t: 'path', d: 'M9.5 5.5L11 7l3-3M4 12h4M4 18h4' },
    { t: 'path', d: 'M11 12h9M11 18h9' },
  ],
  briefcase: [
    { t: 'rect', x: 3.5, y: 7, w: 17, h: 12.5, rx: 2.5 },
    { t: 'path', d: 'M9 7V5.8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V7' },
    { t: 'path', d: 'M3.5 12.5h17' },
  ],
  book: [
    { t: 'path', d: 'M4 5.2A2.2 2.2 0 0 1 6.2 3H12v15.5H6.2A2.2 2.2 0 0 0 4 20.7z' },
    { t: 'path', d: 'M20 5.2A2.2 2.2 0 0 0 17.8 3H12v15.5h5.8A2.2 2.2 0 0 1 20 20.7z' },
    { t: 'path', d: 'M12 3v15.5' },
  ],
  house: [
    { t: 'path', d: 'M4 11l8-7 8 7' },
    { t: 'path', d: 'M6 9.5V20h12V9.5' },
    { t: 'path', d: 'M10 20v-5h4v5' },
  ],
  bulb: [
    { t: 'path', d: 'M9 18h6M10 21h4' },
    { t: 'path', d: 'M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.6 1.4 1.6 2.2h4c0-.8.8-1.6 1.6-2.2A6 6 0 0 0 12 3z' },
  ],
  folder: [{ t: 'path', d: 'M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z' }],
  tag: [
    { t: 'path', d: 'M3.5 3.5v6.9l9.3 9.3a2 2 0 0 0 2.8 0l4.1-4.1a2 2 0 0 0 0-2.8l-9.3-9.3z' },
    { t: 'circle', cx: 7.5, cy: 7.5, r: 1.4 },
  ],
  list: [
    { t: 'path', d: 'M8.5 6H20M8.5 12H20M8.5 18H20' },
    { t: 'path', d: 'M4 6h.01M4 12h.01M4 18h.01' },
  ],
  theme: [
    { t: 'circle', cx: 12, cy: 12, r: 8.5 },
    { t: 'path', d: 'M12 3.5v17a8.5 8.5 0 0 0 0-17z' },
  ],
  shield: [
    { t: 'path', d: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z' },
    { t: 'path', d: 'M9 12l2 2 4-4' },
  ],
  globe: [
    { t: 'circle', cx: 12, cy: 12, r: 8.5 },
    { t: 'path', d: 'M3.5 12h17M12 3.5c2.5 2.3 3.8 5 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5-3.8-8.5s1.3-6.2 3.8-8.5z' },
  ],
  bell: [
    { t: 'path', d: 'M6 16.5v-5a6 6 0 0 1 12 0v5l1.5 2.5h-15z' },
    { t: 'path', d: 'M10 20a2 2 0 0 0 4 0' },
  ],
  database: [
    { t: 'ellipse', cx: 12, cy: 5.5, rx: 7.5, ry: 2.7 },
    { t: 'path', d: 'M4.5 5.5v7c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-7' },
    { t: 'path', d: 'M4.5 12.5v4c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-4' },
  ],
  sync: [
    { t: 'path', d: 'M20 12a8 8 0 0 1-13.7 5.6L4 12' },
    { t: 'path', d: 'M4 12a8 8 0 0 1 13.7-5.6L20 12' },
    { t: 'path', d: 'M4 8v4h4M20 16v-4h-4' },
  ],
  user: [
    { t: 'circle', cx: 12, cy: 8, r: 4 },
    { t: 'path', d: 'M4.5 20a7.5 7.5 0 0 1 15 0' },
  ],
  info: [
    { t: 'circle', cx: 12, cy: 12, r: 8.5 },
    { t: 'path', d: 'M12 11v5' },
    { t: 'path', d: 'M12 7.5h.01' },
  ],
  trash: [
    { t: 'path', d: 'M5 7h14M10 7V5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7' },
    { t: 'path', d: 'M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12' },
    { t: 'path', d: 'M10 11v6M14 11v6' },
  ],
  download: [
    { t: 'path', d: 'M12 4v10M7.5 10.5L12 15l4.5-4.5' },
    { t: 'path', d: 'M5 19.5h14' },
  ],
  help: [
    { t: 'circle', cx: 12, cy: 12, r: 8.5 },
    { t: 'path', d: 'M9.5 9.2a2.5 2.5 0 0 1 4.8 1c0 1.6-2.3 2-2.3 3.3' },
    { t: 'path', d: 'M12 17h.01' },
  ],
  logout: [
    { t: 'path', d: 'M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7' },
    { t: 'path', d: 'M11 12h9M16.5 8.5L20 12l-3.5 3.5' },
  ],
  lock: [
    { t: 'rect', x: 5, y: 10.5, w: 14, h: 9.5, rx: 2 },
    { t: 'path', d: 'M8 10.5V8a4 4 0 0 1 8 0v2.5' },
    { t: 'path', d: 'M12 14.5v2' },
  ],
  font: [
    { t: 'path', d: 'M4 18.5L10 5.5l6 13M7 13h6' },
    { t: 'path', d: 'M16.5 11.5h3M18 10v8' },
  ],
  edit: [
    { t: 'path', d: 'M4.5 19.5l.7-3.2L15.8 5.7a1.9 1.9 0 0 1 2.7 2.7L7.9 19l-3.4.5z' },
    { t: 'path', d: 'M13.8 7.7l2.5 2.5' },
  ],
  share: [
    { t: 'path', d: 'M12 15V4.5M7.5 8L12 3.8 16.5 8' },
    { t: 'path', d: 'M5 11.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7.5' },
  ],
  quill: [
    { t: 'path', d: 'M4.5 19.5c.3-2.2 1.1-3.4 2.4-4.7L18 3.7a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L10.2 18.1c-1.3 1.3-2.5 2.1-4.7 2.4z' },
    { t: 'path', d: 'M3.8 20.2c1.4-.4 2-.9 2.5-2.5M15.5 6.5l2 2' },
  ],
  archive: [
    { t: 'path', d: 'M4.5 6.5h15v12a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z' },
    { t: 'path', d: 'M3.5 6.5h17v-2a1 1 0 0 0-1-1h-15a1 1 0 0 0-1 1z' },
    { t: 'path', d: 'M9.5 12.5h5' },
  ],
};

interface NoteIconProps extends Omit<SvgProps, 'name'> {
  name: NoteIconName;
  size?: number;
  /** 描边颜色（默认无，继承主题常规色） */
  color?: string;
  /** 是否强调色（日朱砂 / 夜极光青） */
  accent?: boolean;
  /** i-more 等实心图标需传 true */
  filled?: boolean;
  label?: string;
}

/**
 * 主题化线性图标（RN/SVG）。换肤走 color/accent：
 * 常规 <NoteIcon name="note" color={noteIconInk(isDark)} />
 * 强调 <NoteIcon name="search" accent />
 */
export function NoteIcon({
  name,
  size = 24,
  color,
  accent,
  filled,
  label,
  ...rest
}: NoteIconProps) {
  const { isDark } = useTheme();
  const shapes = ICON_SHAPES[name];
  if (!shapes) return null;

  const stroke =
    color ??
    (accent ? noteIconAccent(isDark) : noteIconInk(isDark));

  // i-more 实心点：父级 fill=currentColor
  const isFilled = filled === true || name === 'more';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? stroke : 'none'}
      stroke={isFilled ? 'none' : stroke}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityLabel={label}
      accessible={!!label}
      {...rest}
    >
      {shapes.map((s, i) => renderShape(s, i, stroke))}
    </Svg>
  );
}

function renderShape(s: Shape, key: number, stroke: string) {
  switch (s.t) {
    case 'path':
      return (
        <Path
          key={key}
          d={s.d}
          stroke={stroke}
          fill="none"
        />
      );
    case 'circle':
      return (
        <Circle
          key={key}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          stroke={s.fill === 'solid' ? 'none' : stroke}
          fill={s.fill === 'solid' ? stroke : 'none'}
        />
      );
    case 'rect':
      return <Rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} stroke={stroke} fill="none" />;
    case 'ellipse':
      return <Ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} stroke={stroke} fill="none" />;
    default:
      return null;
  }
}
