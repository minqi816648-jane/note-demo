import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * 无障碍动效降级（prefers-reduced-motion）。
 * 返回 true 时业务方应关闭入场/循环动效，退化为静态呈现。
 * 监听系统设置变化，实时切换。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    const apply = (v: boolean) => {
      if (mounted) setReduced(v);
    };

    AccessibilityInfo.isReduceMotionEnabled().then(apply).catch(() => {});

    // RN ≥ 0.71 使用 addEventListener；低版本兼容 addChangeListener/removeEventListener
    const sub: { remove: () => void } | null = AccessibilityInfo.addEventListener
      ? AccessibilityInfo.addEventListener('reduceMotionChanged', apply)
      : null;

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
