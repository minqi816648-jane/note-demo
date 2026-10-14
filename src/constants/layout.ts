// ============================================
// 布局规范常量
// 参考《06-UI交互设计规范.md》
// ============================================
import { Platform } from 'react-native';

// 间距系统
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

// 圆角规范
export const radius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  full: 999,
} as const;

// 字号阶梯
export const fontSize = {
  display: 32,
  title: 24,
  heading: 20,
  subtitle: 16,
  body: 15,
  caption: 13,
  small: 11,
} as const;

// 行高
export const lineHeight = {
  display: 40,
  title: 32,
  heading: 28,
  subtitle: 24,
  body: 22,
  caption: 18,
  small: 16,
} as const;

// 字重
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  heavy: '900' as const,
};

// 字体族（定稿：标题思源宋体、正文思源黑体）
// 未引入字体文件时使用系统近似：Android 用系统 serif/sans，iOS 用默认。
// 引入 expo-font 后可替换为 noto-serif-sc / noto-sans-sc。
export const fontFamily = {
  serif: Platform.select({
    ios: 'serif',
    android: 'serif',
    default: 'serif',
  }) as string,
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) as string,
  serifBlack: Platform.select({
    ios: 'serif',
    android: 'serif',
    default: 'serif',
  }) as string,
};

// 阴影
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

// 组件尺寸
export const componentSize = {
  buttonHeight: 48,
  inputHeight: 48,
  iconButton: 40,
  fab: 56,
  tagHeight: 24,
  touchTarget: 44,
} as const;

// P1 扩展页尺寸 token（日历 / 图库 / 附件 / 分享）
export const calGrid = {
  cellMinHeight: 38, // 日历格最小高度
  dotSm: 3, // 小墨点
  dotMd: 4, // 中墨点
} as const;

export const galleryToken = {
  gap: 8, // 瀑布流间距
  cardRadius: 12, // 图库卡片圆角
} as const;
