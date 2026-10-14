import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { useAIStore } from '../../stores/aiStore';
import { MessageBubble } from '../../src/components/ai/MessageBubble';
import { EmptyState, AuroraBackground, ConfirmDialog } from '../../src/components/common';
import { TodoService } from '../../services';
import type { AIMessage } from '../../src/constants/theme';

export default function AIChatScreen() {
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const router = useRouter();
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    isLoading,
    error,
    noApiKey,
    activeProvider,
    fetchConversations,
    createConversation,
    deleteConversation,
    setCurrentConversation,
    sendMessage,
    clearError,
  } = useAIStore();

  const [input, setInput] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const listRef = useRef<FlatList<AIMessage>>(null);

  // 加载会话列表
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleNewChat = useCallback(async () => {
    await createConversation();
    setShowConversations(false);
  }, [createConversation]);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConfirmDeleteId(id);
    },
    []
  );

  const confirmDelete = useCallback(
    (id: string) => {
      deleteConversation(id);
      setConfirmDeleteId(null);
    },
    [deleteConversation]
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      setCurrentConversation(id);
      setShowConversations(false);
    },
    [setCurrentConversation]
  );

    const quickChips = ['总结笔记', '提炼待办', '润色', '翻译'];

  const handleChip = useCallback(
    (label: string) => {
      setInput(label);
    },
    []
  );

  // 印章按钮：把 AI 答复加入待办
  const handleAddTodo = useCallback(async (content: string) => {
    try {
      await TodoService.createTodo({
        title: (content || '待办事项').slice(0, 60),
        source: 'manual',
      });
      Alert.alert('已加入待办');
    } catch (error) {
      Alert.alert('添加失败', (error as Error).message);
    }
  }, []);

  // 印章按钮「查看原文」：跳转到第一条引用的源笔记
  const handleViewSource = useCallback(
    (message: AIMessage) => {
      let refs: { id?: string; title?: string; name?: string }[] = [];
      try {
        if (message.referenced_notes) {
          const parsed = JSON.parse(message.referenced_notes);
          if (Array.isArray(parsed)) refs = parsed;
        }
      } catch {
        // 忽略解析错误
      }
      const first = refs.find((r) => r.id);
      if (first?.id) {
        router.push(`/note/${first.id}`);
      } else {
        Alert.alert('提示', '该回答暂无来源笔记可跳转');
      }
    },
    [router]
  );

  // 点击引用贴纸：跳转到对应源笔记
  const handleOpenNote = useCallback(
    (noteId: string) => {
      router.push(`/note/${noteId}`);
    },
    [router]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <AuroraBackground style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部标题栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => setShowConversations(true)} style={styles.headerLeft}>
          <Text style={styles.headerMenuIcon}>☰</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI 助手</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNewChat} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>＋ 新对话</Text>
        </TouchableOpacity>
      </View>

      {/* 会话列表弹窗 */}
      <Modal visible={showConversations} transparent animationType="slide" onRequestClose={() => setShowConversations(false)}>
        <TouchableOpacity style={styles.modalMask} onPress={() => setShowConversations(false)} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>历史对话</Text>
            <TouchableOpacity onPress={() => setShowConversations(false)}>
              <Text style={[styles.sheetClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            style={styles.convList}
            renderItem={({ item }) => (
              <View style={styles.convRow}>
                <TouchableOpacity
                  style={[styles.convItem, currentConversationId === item.id && { backgroundColor: colors.card }]}
                  onPress={() => handleSelectConversation(item.id)}
                >
                  <Text
                    style={[styles.convTitle, { color: currentConversationId === item.id ? colors.primary : colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.title || '新对话'}
                  </Text>
                  <Text style={[styles.convMeta, { color: colors.textDisabled }]}>
                    {item.message_count} 条消息
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.convDelete} onPress={() => handleDeleteConversation(item.id)}>
                  <Text style={[styles.convDeleteText, { color: colors.danger }]}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="💬"
                title="还没有对话"
                description="点击右上角新建对话开始提问"
              />
            }
          />
        </View>
      </Modal>

      {/* 对话区 */}
      {messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            iconName="ai"
            title="知你笔记 · 答你所问"
            description="询问笔记内容、生成摘要、提取待办事项等"
            caption="点下方便捷指令或直接输入提问"
          />
          {noApiKey && (
            <TouchableOpacity
              style={[styles.noKeyBanner, { backgroundColor: colors.card, borderColor: colors.warning }]}
            >
              <Text style={[styles.noKeyText, { color: colors.textSecondary }]}>
                ⚠️ 尚未配置 AI API Key，请到「设置 → AI 服务」配置后再提问
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              isStreaming={isStreaming && index === messages.length - 1 && item.role === 'assistant'}
              onAddTodo={handleAddTodo}
              onViewSource={handleViewSource}
              onOpenNote={handleOpenNote}
            />
          )}
          ListHeaderComponent={
            <View style={[styles.providerRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                基于你的笔记作答 · 引用均可溯源
              </Text>
            </View>
          }
        />
      )}

      {/* 错误提示 */}
      {error && (
        <View style={[styles.errorBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.danger }]} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={[styles.errorClose, { color: colors.textDisabled }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 纸签快捷指令 */}
      {!isStreaming && (
        <View style={styles.chipsWrap}>
          {quickChips.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleChip(c)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: colors.textPrimary }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 输入区 */}
      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card }]}
          placeholder="问点什么，或按住说话..."
          placeholderTextColor={colors.textDisabled}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={isStreaming || !input.trim()}
          activeOpacity={0.7}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        iconName="trash"
        danger
        title="删除对话"
        message="确定删除该对话吗？"
        confirmLabel="删除"
        onConfirm={() => {
          if (confirmDeleteId) confirmDelete(confirmDeleteId);
        }}
      />
      </AuroraBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerMenuIcon: {
    fontSize: fontSize.subtitle,
    marginRight: spacing.s,
    color: '#4A453A',
  },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  headerButton: {
    paddingVertical: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '70%',
    minHeight: 300,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  sheetTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  sheetClose: {
    fontSize: fontSize.subtitle,
    padding: spacing.xs,
  },
  convList: {
    paddingHorizontal: spacing.m,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  convItem: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
  },
  convTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  convMeta: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  convDelete: {
    padding: spacing.s,
  },
  convDeleteText: {
    fontSize: fontSize.caption,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: spacing.m,
  },
  providerRow: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.m,
  },
  providerText: {
    fontSize: fontSize.small,
    textAlign: 'center',
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.caption,
    marginRight: spacing.m,
  },
  errorClose: {
    fontSize: fontSize.subtitle,
    padding: spacing.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    fontSize: fontSize.body,
    marginRight: spacing.s,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFF',
    fontSize: fontSize.subtitle,
  },
  noKeyBanner: {
    marginHorizontal: spacing.m,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noKeyText: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    gap: spacing.s,
    backgroundColor: 'transparent',
  },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
