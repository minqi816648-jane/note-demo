import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme';
import { ErrorBoundary } from '../src/components/common';
import { PlusSheetProvider } from '../src/context/PlusSheetContext';
import { ToastProvider } from '../src/context/ToastContext';
import { initDB } from '../services/db/database';
import { sanitizeRichHtml } from '../src/utils/html';

// 与 NoteCaptureTileService.CAPTURE_TOKEN 保持一致
const CAPTURE_TOKEN = 'note-demo-tile-capture-v1';
const TITLE_MAX = 200;
// 深链去重冷却（毫秒）
const DEDUP_COOLDOWN_MS = 2000;

export default function RootLayout() {
  const router = useRouter();
  const handledHostRef = useRef<string | null>(null);
  const lastHandledAtRef = useRef<number>(0);

  // 初始化数据库
  useEffect(() => {
    initDB().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  // 处理深链：
  //   note-demo://save-link?url=...&title=...  （分享链接存链接库）
  //   note-demo://capture[?token=...]          （截屏：磁贴带 token 直达，外部来源走确认框）
  useEffect(() => {
    // 冷启动时 activity/DB 可能尚未就绪，此处等待 DB 初始化并带重试兜底
    async function doCapture() {
      try {
        await initDB();
        const { captureToImageNote } = await import('../services/screenCapture.service');

        let noteId: string | null = null;
        let lastError: unknown = null;
        for (let i = 0; i < 3; i++) {
          try {
            const result = await captureToImageNote();
            noteId = result.noteId;
            break;
          } catch (e) {
            lastError = e;
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        if (noteId) {
          router.push(`/note/${noteId}`);
        } else {
          console.error('截屏失败:', lastError);
        }
      } catch (error) {
        console.error('截屏失败:', error);
      }
    }

    // 外部来源（无合法 token）触发截屏前的一次确认
    function confirmExternalCapture() {
      Alert.alert(
        '截屏存笔记',
        '将截取当前屏幕并保存为笔记（可能包含其它应用内容）。是否继续？',
        [
          { text: '取消', style: 'cancel' },
          { text: '继续', onPress: () => doCapture() },
        ]
      );
    }

    function handleUrl(url: string) {
      const now = Date.now();
      const { hostname, queryParams } = Linking.parse(url);
      if (!hostname) return;

      // 去重：同一 hostname 冷却期内忽略（避免 query 变化绕过）
      if (handledHostRef.current === hostname && now - lastHandledAtRef.current < DEDUP_COOLDOWN_MS) {
        return;
      }
      handledHostRef.current = hostname;
      lastHandledAtRef.current = now;

      if (hostname === 'save-link') {
        if (!queryParams || typeof queryParams.url !== 'string') return;
        const target = queryParams.url as string;
        // 协议白名单：仅 http(s)
        if (!/^https?:\/\//i.test(target)) return;
        const rawTitle = typeof queryParams.title === 'string' ? (queryParams.title as string) : '';
        const title = sanitizeRichHtml(rawTitle).slice(0, TITLE_MAX);
        router.push({
          pathname: '/link/new',
          params: { url: target, ...(title ? { title } : {}) },
        });
        return;
      }

      if (hostname === 'capture') {
        const token = queryParams && typeof queryParams.token === 'string' ? queryParams.token : null;
        if (token === CAPTURE_TOKEN) {
          doCapture();
        } else {
          confirmExternalCapture();
        }
      }
    }

    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <PlusSheetProvider>
          <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // 标准化转场：推入屏自右滑入；modal 屏自下浮起
              animation: 'slide_from_right',
              animationDuration: 260,
            }}
          >
          <Stack.Screen name="tabs" />
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="note/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="todo/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom', title: '待办' }} />
          <Stack.Screen name="note/[id]/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="folder/[id]" />
          <Stack.Screen name="category/[id]"
            options={{ presentation: 'modal', animation: 'slide_from_bottom', title: '分类' }} />
          <Stack.Screen name="trash" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="folders" />
          <Stack.Screen name="ai-settings" />
          <Stack.Screen name="search" />
          <Stack.Screen name="voice-record" />
          <Stack.Screen name="pending-classification" />
          <Stack.Screen name="saved-links" />
          <Stack.Screen name="link/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom', title: '链接' }} />
          <Stack.Screen name="attachment/[id]" options={{ animation: 'slide_from_right', title: '附件预览' }} />
          </Stack>
          </ToastProvider>
          </PlusSheetProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
