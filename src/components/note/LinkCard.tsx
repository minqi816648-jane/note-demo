import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

interface LinkCardProps {
  url: string;
  saved?: boolean;
  onSave?: (url: string) => void;
}

/**
 * 链接卡片组件
 * 展示识别到的 URL，支持点击预览和保存到链接库
 */
export function LinkCard({ url, onSave, saved = false }: LinkCardProps) {
  const { colors } = useTheme();

  // 获取域名作为展示标题
  let host = '链接';
  try {
    host = new URL(url).host;
  } catch {
    // 忽略解析错误
  }

  const handleOpen = () => {
    WebBrowser.openBrowserAsync(url).catch(() => {
      Linking.openURL(url);
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        shadow.light,
      ]}
      onPress={handleOpen}
      activeOpacity={0.8}
    >
      {/* 站点图标 */}
      <View style={[styles.iconBox, { backgroundColor: colors.card }]}>
        <Image
          source={{ uri: `https://www.google.com/s2/favicons?domain=${host}&sz=64` }}
          style={styles.favicon}
        />
      </View>

      {/* 链接信息 */}
      <View style={styles.info}>
        <Text style={[styles.host, { color: colors.textPrimary }]} numberOfLines={1}>
          {host}
        </Text>
        <Text style={[styles.url, { color: colors.textDisabled }]} numberOfLines={2}>
          {url}
        </Text>
      </View>

      {/* 保存按钮 */}
      {onSave && (
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.card }]}
          onPress={(e) => {
            e.stopPropagation?.();
            onSave(url);
          }}
        >
          <Text style={[styles.saveButtonText, { color: saved ? colors.success : colors.primary }]}>
            {saved ? '已保存' : '保存'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.s,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
    overflow: 'hidden',
  },
  favicon: {
    width: 28,
    height: 28,
  },
  info: {
    flex: 1,
    marginRight: spacing.s,
  },
  host: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    marginBottom: 2,
  },
  url: {
    fontSize: fontSize.small,
  },
  saveButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
  },
  saveButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
