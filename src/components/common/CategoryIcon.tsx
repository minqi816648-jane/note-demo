import React from 'react';
import { Text } from 'react-native';
import { NoteIcon, type NoteIconName } from './NoteIcon';

/** 系统分类（按 slug）→ 主题线标（slog 图标集） */
const SYSTEM_CATEGORY_ICONS: Record<string, NoteIconName> = {
  work: 'briefcase',
  study: 'book',
  life: 'house',
  idea: 'bulb',
  todo: 'check',
};

/**
 * 分类可选线标清单 —— 分类编辑页图标选择器用
 * 存到 Category.icon 的值即线标名（NoteIconName）。
 */
export const CATEGORY_ICON_OPTIONS: { name: NoteIconName; label: string }[] = [
  { name: 'briefcase', label: '工作' },
  { name: 'book', label: '学习' },
  { name: 'house', label: '生活' },
  { name: 'bulb', label: '想法' },
  { name: 'star', label: '收藏' },
  { name: 'check', label: '待办' },
  { name: 'folder', label: '文件夹' },
  { name: 'tag', label: '标签' },
  { name: 'mic', label: '语音' },
  { name: 'img', label: '图片' },
  { name: 'link', label: '链接' },
  { name: 'clip', label: '附件' },
  { name: 'brush', label: '印章' },
];

const CATEGORY_ICON_NAME_SET: ReadonlySet<string> = new Set(
  CATEGORY_ICON_OPTIONS.map((o) => o.name)
);

/** 判断某字符串是否为可选线标名 */
export function isCategoryIconName(value: string | null | undefined): value is NoteIconName {
  return !!value && CATEGORY_ICON_NAME_SET.has(value);
}

/**
 * 解析分类应呈现的线标：
 * 1) 系统内置 slug → 对应线标；
 * 2) 存储的 icon 为线标名 → 用之；
 * 3) 否则返回 null（回退到 emoji 原文）。
 */
export function categoryIconName(cat: { slug?: string | null; name?: string | null; icon?: string | null } | null | undefined): NoteIconName | null {
  if (!cat) return null;
  if (cat.slug && SYSTEM_CATEGORY_ICONS[cat.slug]) {
    return SYSTEM_CATEGORY_ICONS[cat.slug];
  }
  if (isCategoryIconName(cat.icon)) {
    return cat.icon;
  }
  return null;
}

interface CategoryIconProps {
  /** 分类对象（取 slug / icon / name） */
  category: { slug?: string | null; name?: string | null; icon?: string | null } | null | undefined;
  size?: number;
  /** 线标颜色（默认用主题常规色） */
  color?: string;
  /** 是否跟随主题强调色（日朱砂 / 夜极光青） */
  accent?: boolean;
}

/**
 * 分类图标：线标（按 slug 或存储的线标名）→ 否则回退到存储的 emoji。
 */
export function CategoryIcon({ category, size = 16, color, accent }: CategoryIconProps) {
  const name = categoryIconName(category);
  if (name) {
    return <NoteIcon name={name} size={size} color={color} accent={accent} />;
  }
  // 回退：用存储的 emoji 图标（若有）
  if (category?.icon) {
    return <Text style={{ fontSize: size }}>{category.icon}</Text>;
  }
  return null;
}
