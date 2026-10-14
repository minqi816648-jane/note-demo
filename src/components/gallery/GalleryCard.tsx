import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { galleryToken } from '../../theme';
import { spacing, fontSize, fontWeight, shadow } from '../../theme';
import { AdaptiveImage, PressableScale } from '../common';

// 图库卡片图片高度上限：纵向长图在双栏瀑布流内完整显示（等比缩放不裁切）
const IMG_MAX_H = 280;

export type GalleryItemType = 'image' | 'video' | 'ocr' | 'abstract';

export interface GalleryItem {
  id: string;
  noteId: string;
  type: GalleryItemType;
  title: string;
  preview?: string | null;
  thumbnail?: string | null;
  ocrText?: string | null;
  duration?: number | null;
  createdAt: string;
  isFavorite?: boolean;
  hasError?: boolean;
}

interface GalleryCardProps {
  item: GalleryItem;
  onPress: () => void;
  onRetry?: () => void;
  /** 懒加载：卡片所在年月组是否在可视区 */
  inView?: boolean;
}

/**
 * 图库卡片：图片/视频/OCR/无图抽象/加载失败 五种呈现。
 * 多模态信息统一叠在底部（标题+元数据）。
 */
export function GalleryCard({ item, onPress, onRetry, inView = true }: GalleryCardProps) {
  const { colors, isDark } = useTheme();
  const meta = formatMeta(item);

  const renderMedia = () => {
    if (item.hasError) {
      return (
        <TouchableOpacity style={[styles.media, styles.fail, { backgroundColor: colors.galleryFailBg }]} onPress={onRetry} activeOpacity={0.7}>
          <Text style={[styles.failIcon, { color: colors.textSecondary }]}>💧</Text>
          <Text style={[styles.failText, { color: colors.textSecondary }]}>图已失墨 · 点击重试</Text>
        </TouchableOpacity>
      );
    }

    // OCR 文档（有识别文字）
    if (item.type === 'ocr' && item.ocrText) {
      return (
        <View style={[styles.media, { backgroundColor: colors.galleryFailBg }]}>
          <Text style={[styles.ocrText, { color: colors.textPrimary }]} numberOfLines={4}>
            {item.ocrText}
          </Text>
          <View style={[styles.ocrBadge, { backgroundColor: colors.ocrBadgeBg }]}>
            <Text style={styles.ocrBadgeLabel}>OCR</Text>
          </View>
        </View>
      );
    }

    // 无图（纯文本笔记）：简洁底 + 突出内容摘要
    if (item.type === 'abstract') {
      return (
        <View style={[styles.media, styles.abstract, isDark && styles.abstractDark]}>
          {item.preview ? (
            <Text
              style={[styles.abstractPreview, { color: colors.textPrimary }]}
              numberOfLines={5}
            >
              {item.preview}
            </Text>
          ) : (
            <Text style={[styles.abstractEmpty, { color: colors.textDisabled }]}>
              无文字内容
            </Text>
          )}
        </View>
      );
    }

    // 无缩略图的视频占位
    if (!item.thumbnail && item.type === 'video') {
      return (
        <View style={[styles.media, { backgroundColor: colors.galleryFailBg }]}>
          <Text style={styles.thumbPlaceholderIcon}>🎬</Text>
          <View style={[styles.playBtn, { backgroundColor: colors.videoBadgeBg }]}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
      );
    }

    // 图片 / 视频缩略（自适应宽高比，maxHeight 内完整显示不裁切）
    return (
      <View style={styles.media}>
        {item.thumbnail ? (
          <AdaptiveImage uri={item.thumbnail} maxHeight={IMG_MAX_H} inView={inView} />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.galleryFailBg }]}>
            <Text style={styles.thumbPlaceholderIcon}>{item.type === 'video' ? '🎬' : '🖼️'}</Text>
          </View>
        )}

        {item.type === 'video' && (
          <>
            <View style={[styles.playBtn, { backgroundColor: colors.videoBadgeBg }]}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
            {item.duration != null && item.duration > 0 && (
              <View style={[styles.duration, { backgroundColor: colors.videoBadgeBg }]}>
                <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
              </View>
            )}
          </>
        )}

        {item.type === 'ocr' && (
          <View style={[styles.ocrBadge, { backgroundColor: colors.ocrBadgeBg }]}>
            <Text style={styles.ocrBadgeLabel}>OCR文字</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <PressableScale
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadow.light]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${meta ? `，${meta}` : ''}`}
    >
      {renderMedia()}
      <View style={[styles.info, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textDisabled }]}>
          {meta}
        </Text>
      </View>
    </PressableScale>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
}

function formatMeta(item: GalleryItem): string {
  const d = item.createdAt.slice(0, 10);
  let s = ''; // 元数据（简化：日期）
  if (item.type === 'ocr') s = 'OCR';
  else if (item.type === 'video') s = '视频';
  return s ? `${d} · ${s}` : d;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: galleryToken.cardRadius,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: galleryToken.gap,
  },
  media: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    height: IMG_MAX_H,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  thumbPlaceholderIcon: {
    fontSize: 40,
  },
  ocrText: {
    padding: spacing.m,
    fontSize: fontSize.caption,
    lineHeight: 18,
  },
  ocrBadge: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: 99,
  },
  ocrBadgeLabel: {
    color: '#FFF',
    fontSize: fontSize.small,
  },
  playBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 2,
  },
  duration: {
    position: 'absolute',
    bottom: spacing.s,
    right: spacing.s,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 9,
  },
  abstract: {
    backgroundColor: 'transparent',
  },
  abstractDark: {
    backgroundColor: 'transparent',
  },
  abstractPreview: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
    lineHeight: 24,
    padding: spacing.s,
  },
  abstractEmpty: {
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  fail: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  failIcon: {
    fontSize: 24,
  },
  failText: {
    fontSize: fontSize.small,
  },
  info: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  title: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
    lineHeight: 16,
  },
  meta: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
});
