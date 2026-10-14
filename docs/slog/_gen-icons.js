const fs = require('fs');
const path = 'note-demo-主题化图标集.html';
const h = fs.readFileSync(path, 'utf8');

// --- extract symbols ---
const re = /<symbol id="(i-[^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g;
const syms = [];
let m;
while ((m = re.exec(h))) {
  syms.push({ id: m[1], viewBox: m[2], body: m[3].trim() });
}

// --- category/name/usage map from registry ---
const regRe = /\{i:'(i-[^']+)'[^}]*?n:'([^']+)'[^}]*?c:'(\w+)'[^}]*?u:'([^']+)'/g;
const catMap = {};
let r;
while ((r = regRe.exec(h))) {
  catMap[r[1]] = { name: r[2], cat: r[3], use: r[4] };
}

const catNames = {
  nav: 'bottom-nav', tool: 'action', view: 'view-switch',
  cat: 'category-tag', media: 'media', edit: 'editor-state', set: 'settings'
};

// --- 1. icons.json ---
const json = {
  schema: 'note-demo icon set v1',
  count: syms.length,
  designSpec: {
    grid: 24, strokeWidth: 1.75, fill: 'none', linecap: 'round', linejoin: 'round',
    colors: {
      day: { ink: '#1C1B18', accent: '#B83A2A' },
      night: { ink: '#F2F4FF', accent: '#8FE7F5' }
    }
  },
  categories: Object.fromEntries(Object.entries(catNames).map(([k, v]) => [k, v])),
  icons: syms.map(function (s) {
    const meta = catMap[s.id] || { name: s.id.replace('i-', ''), cat: 'media', use: '—' };
    return {
      id: s.id, name: meta.name, category: meta.cat, usage: meta.use,
      viewBox: s.viewBox, body: s.body
    };
  })
};
fs.writeFileSync('icons.json', JSON.stringify(json, null, 2));
console.log('wrote icons.json (' + json.count + ' icons)');

// --- 2. standalone SVG sprite ---
let out = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">\n<!-- note-demo theme icon sprite · ' + json.count + ' icons · stroke 1.75 · 24 grid -->\n';
syms.forEach(function (s) {
  out += '  <symbol id="' + s.id + '" viewBox="' + s.viewBox + '">' + s.body + '</symbol>\n';
});
out += '</svg>\n';
fs.writeFileSync('note-demo-icons.svg', out);
console.log('wrote note-demo-icons.svg');

// --- 3. React component (NoteIcon.tsx) ---
// convert symbol body to JSX (self-close void elements)
function toJsx(body) {
  return body
    .replace(/<([a-z]+)([^>]*)\/>/g, '<$1$2 />')
    .trim();
}
const entries = syms.map(function (s) {
  const meta = catMap[s.id] || { name: s.id.replace('i-', '') };
  const jsx = toJsx(s.body);
  return "  '"+s.id+"': (\n    <>\n      "+jsx+"\n    </>\n  )";
}).join(',\n');

const tsx = `import React from 'react';

/**
 * note-demo 主题化图标组件
 * 规范：24×24 网格 · 1.75px 描边 · round 端点
 * 主题：日 焦墨#1C1B18 / 夜 雾白#F2F4FF（由 CSS color 继承）；选中强调 朱砂/极光青
 * 用法：<NoteIcon name="note" size={24} />
 */
export type NoteIconName = ${syms.map(function(s){return "'"+s.id.replace('i-','')+"'";}).join(' | ')};

const ICON_PATHS: Record<string, React.ReactNode> = {
${entries}
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
`;
fs.writeFileSync('NoteIcon.tsx', tsx);
console.log('wrote NoteIcon.tsx');
