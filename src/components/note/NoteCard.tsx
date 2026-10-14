import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { Tag, PressableScale } from '../common';
import type { Note } from '../../constants/theme';
import { formatDate } from '../../utils/date';

interface NoteCardProps {
  note: Note;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * 笔记卡片组件
 * 用于笔记列表页展示笔记摘要
 */
export function NoteCard({ note, onPress, onLongPress }: NoteCardProps) {
  const { colors } = useTheme();

  // 解析 AI 标签
  let aiTags: string[] = [];
  try {
    if (note.ai_tags) {
      aiTags = JSON.parse(note.ai_tags);
    }
  } catch (e) {
    // 忽略解析错误
  }

  // 获取摘要（优先用 AI 摘要，否则用纯文本截断）
  const getPreview = (): string => {
    if (note.ai_summary) return note.ai_summary;
    if (note.content_text) {
      return note.content_text.length > 80
        ? `${note.content_text.slice(0, 80)}...`
        : note.content_text;
    }
    return '';
  };

  // 标题（如果没有标题，用内容前几个字）
  const getTitle = (): string => {
    if (note.title) return note.title;
    if (note.content_text) {
      const firstLine = note.content_text.split('\n')[0];
      return firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;
    }
    return '无标题笔记';
  };

  return (
    <PressableScale
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadow.light,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {getTitle()}
        </Text>
        {note.is_favorite === 1 && (
          <Text style={styles.favoriteIcon}>⭐</Text>
        )}
      </View>

      {getPreview() !== '' && (
        <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
          {getPreview()}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.tagsContainer}>
          {aiTags.slice(0, 3).map((tagName, index) => (
            <Tag key={`${tagName}-${index}`} label={tagName} style={styles.tag} />
          ))}
        </View>
        <Text style={[styles.date, { color: colors.textDisabled }]}>
          {formatDate(note.updated_at)}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
    flex: 1,
    marginRight: spacing.s,
  },
  favoriteIcon: {
    fontSize: fontSize.caption,
  },
  preview: {
    fontSize: fontSize.body,
    marginBottom: spacing.s,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: spacing.s,
  },
  tag: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    height: 20,
    paddingHorizontal: spacing.s,
  },
  date: {
    fontSize: fontSize.small,
  },
});