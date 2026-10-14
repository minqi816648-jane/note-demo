import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 统一的顶部 + 底部安全区处理。
 * 替代原先 `Platform.OS === 'ios' ? 50 : 16` 这类硬编码，
 * 使标题栏真正贴近各机型的状态栏与底部横条。
 */

/**
 * 返回顶部标题栏（含状态栏）所需的 paddingTop。
 * 已内置一小段常规留白，header 直接使用即可。
 */
export function useHeaderTopInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top + 16;
}

/**
 * 返回底部安全区额外留白（适用于滚动内容 / 浮动按钮 / 输入区）。
 * 常规情况下返回 insets.bottom。
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom;
}

/**
 * 返回完整 insets 对象，供需要细致控制的场景使用。
 */
export { useSafeAreaInsets };
