import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * 全局错误边界。
 * 捕获子树渲染 / 生命周期抛出的异常，避免整屏白屏，
 * 展示可读提示并允许「重试 / 回到首页」。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // 便于复现 / 排查，上报到控制台
    console.error('[ErrorBoundary]', error, info);
  }

  handleRetry = () => {
    // 清除错误态，重新渲染子树
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return <ErrorFallback message={this.state.message} onRetry={this.handleRetry} />;
  }
}

/**
 * 错误提示 UI（用函数组件以访问 Theme 与 Router）。
 */
function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleHome = () => {
    // 先清除错误态，再重置到首页，避免跳转后仍残留错误画面
    onRetry();
    // 重置整个导航栈，回到笔记首页（tabs 为 expo-router 默认初始路由）
    router.dismissAll?.();
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>页面出现了一点问题</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        抱歉，程序遇到未知错误。你可以重试，或返回首页。
      </Text>
      <Text style={[styles.message, { color: colors.textDisabled }]} numberOfLines={4}>
        {message}
      </Text>

      <View style={styles.actions}>
        <Button title="重试" onPress={onRetry} style={styles.actionButton} />
        <Button title="回到首页" variant="outline" onPress={handleHome} style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.m,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.body,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  message: {
    fontSize: fontSize.small,
    marginBottom: spacing.xl,
    textAlign: 'center',
    maxWidth: '90%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  actionButton: {
    minWidth: 120,
  },
});
