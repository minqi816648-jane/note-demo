import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../../theme';
import type { AIMessage } from '../../constants/theme';

interface MessageBubbleProps {
  message: AIMessage;
  isStreaming?: boolean;
  /** AI 建议「加入待办」按钮 */
  onAddTodo?: (content: string) => void;
  /** AI 建议「查看原文」按钮 */
  onViewSource?: (message: AIMessage) => void;
  /** 点击引用贴纸/查看原文时跳转源笔记 */
  onOpenNote?: (noteId: string) => void;
}

interface RefNote {
  id?: string;
  title?: string;
  name?: string;
}

/**
 * 单条聊天消息气泡（水墨 × 纸间融合）
 * AI = 朱砂封印头像 + 宣纸卡 + 关键词描金 + 引用贴纸 + 印章行动按钮
 * 用户 = 深墨块右对齐
 */
export function MessageBubble({ message, isStreaming = false, onAddTodo, onViewSource, onOpenNote }: MessageBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';

  const content = message.content || '';
  const showTyping = !isUser && isStreaming && content.trim() === '';

  if (isUser) {
    return (
      <View style={[styles.row, styles.right]}>
        <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
          <Text style={styles.userText} selectable>
            {content}
          </Text>
        </View>
      </View>
    );
  }

  // 解析引用贴纸
  let refs: RefNote[] = [];
  try {
    if (message.referenced_notes) {
      const parsed = JSON.parse(message.referenced_notes);
      if (Array.isArray(parsed)) refs = parsed;
    }
  } catch {
    // 忽略解析错误
  }

  const openRef = (r: RefNote) => {
    if (r.id && onOpenNote) onOpenNote(r.id);
  };

  return (
    <View style={[styles.row, styles.left]}>
      {/* 朱砂封印头像 */}
      <View style={[styles.seal, { backgroundColor: colors.primary }]}>
        <Text style={styles.sealText}>墨</Text>
      </View>

      <View style={[styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* 头部 */}
        <View style={styles.who}>
          <Text style={[styles.whoName, { color: colors.textPrimary, fontFamily: fontFamily.serif }]}>问墨</Text>
        </View>

        {showTyping ? (
          <Text style={[styles.typing, { color: colors.textSecondary }]}>研墨中...</Text>
        ) : (
          <HighlightedText text={content} colors={colors} />
        )}

        {refs.length > 0 && (
          <View style={styles.refs}>
            {refs.map((r, i) => (
              <TouchableOpacity
                key={`${r.id ?? ''}-${i}`}
                style={[styles.refTag, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openRef(r)}
                disabled={!r.id || !onOpenNote}
                activeOpacity={0.7}
              >
                <Text style={[styles.refText, { color: colors.textSecondary }]} numberOfLines={1}>
                  📎 {r.title || r.name || '引用笔记'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 印章行动按钮 */}
        {!showTyping && content.trim() !== '' && (onAddTodo || onViewSource) && (
          <View style={styles.acts}>
            {onAddTodo && (
              <TouchableOpacity
                style={[styles.stampBtn, styles.stampBtnAcc, { backgroundColor: colors.primary }]}
                onPress={() => onAddTodo(content)}
                activeOpacity={0.8}
              >
                <Text style={styles.stampBtnAccText}>✓ 加入待办</Text>
              </TouchableOpacity>
            )}
            {onViewSource && refs.length > 0 && (
              <TouchableOpacity
                style={[styles.stampBtn, { borderColor: colors.primary, backgroundColor: colors.card }]}
                onPress={() => onViewSource(message)}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.primary }}>查看原文</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * 分段渲染文本，将 **关键词** 与 "引号词" 用描金高亮。
 * 解析 `**x**`（描金）与 `"x"`（描金），其余为普通文本。
 */
function HighlightedText({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  const parts = text.split(/(\*\*[^*]+\*\*|"[^"]*")/g).filter((p) => p);
  return (
    <Text style={[styles.aiText, { color: colors.textPrimary }]} selectable>
      {parts.map((part, i) => {
        const isGold =
          (part.startsWith('**') && part.endsWith('**')) || (part.startsWith('"') && part.endsWith('"'));
        const raw = part.startsWith('**') ? part.slice(2, -2) : part;
        return isGold ? (
          <Text key={i} style={[styles.goldHighlight, { backgroundColor: colors.gold, color: colors.goldText }]}>
            {raw}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
    paddingHorizontal: spacing.m,
  },
  left: {
    justifyContent: 'flex-start',
  },
  right: {
    justifyContent: 'flex-end',
  },
  seal: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
    marginTop: 2,
    transform: [{ rotate: '-4deg' }],
  },
  sealText: {
    color: '#F6F1E6',
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '900',
  },
  userBubble: {
    maxWidth: '78%',
    borderRadius: radius.l,
    borderTopRightRadius: 4,
    paddingVertical: spacing.s + 2,
    paddingHorizontal: spacing.m,
  },
  userText: {
    color: '#FFF',
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  aiBubble: {
    maxWidth: '82%',
    borderRadius: radius.l,
    borderTopLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.s + 2,
    paddingHorizontal: spacing.m,
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  whoName: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  aiText: {
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  goldHighlight: {
    fontWeight: fontWeight.semiBold,
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  typing: {
    fontSize: fontSize.body,
    fontStyle: 'italic',
  },
  refs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.s,
    gap: spacing.s,
  },
  refTag: {
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  refText: {
    fontSize: fontSize.small,
  },
  acts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  stampBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: radius.m,
    borderWidth: 1,
  },
  stampBtnAcc: {
    borderColor: 'transparent',
    // 硬投影（印章质感）
    shadowColor: '#000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 3,
  },
  stampBtnAccText: {
    color: '#FFF',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
  },
});
