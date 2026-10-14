// ============================================
// 本地通知服务（用于待办提醒等本地通知）
// 注意：expo-notifications 为原生模块，且 Expo Go（SDK53+）移除了其远程推送支持，
// 一旦顶层 import 会在页面/路由加载时抛错。因此统一「函数内动态 import」，
// 仅在真正调用提醒时才加载；Expo Go / 加载失败时安全降级（返回 null/false）。
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_MAP_KEY = 'todo_reminder_notifications';

// 是否已初始化通知处理器
let handlerRegistered = false;

// 惰性获取 Notifications 模块（Expo Go 或加载失败返回 null）
async function getNotifications(): Promise<typeof import('expo-notifications') | null> {
  try {
    const mod = await import('expo-notifications');
    // 注册前台展示处理器（仅在首次调用且能加载时做一次）
    if (!handlerRegistered) {
      handlerRegistered = true;
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
    return mod;
  } catch {
    // Expo Go 等不受支持环境：不加载，安全降级
    return null;
  }
}

/**
 * 请求通知权限（Expo Go / 不支持时返回 false）
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted && settings.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    return granted;
  } catch {
    return false;
  }
}

/**
 * 定时通知待办提醒
 * @returns 通知 ID；失败/不支持返回 null
 */
export async function scheduleTodoReminder(todoId: string, title: string, remindAt: Date): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '待办提醒',
        body: title,
        sound: 'default',
        data: { todoId, type: 'todo_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remindAt,
      },
    });
  } catch {
    return null;
  }
}

/**
 * 取消待办提醒（按其存储的 notification id）
 */
export async function cancelReminder(notificationId?: string | null): Promise<void> {
  if (!notificationId) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // 忽略
  }
}

/**
 * 为待办提醒预留——由于 todos 表无 notification_id 列，
 * 这里回调通知 ID 由调用方自行保存。
 */
export async function scheduleTodoReminderWithCallback(
  todoId: string,
  title: string,
  remindAt: Date,
  onScheduled: (notificationId: string) => void | Promise<void>
): Promise<void> {
  const id = await scheduleTodoReminder(todoId, title, remindAt);
  if (id) await onScheduled(id);
}

// ---------- 待办提醒通知 ID 映射（AsyncStorage） ----------

/** 保存 todo 的通知 ID */
export async function setTodoReminderNotification(todoId: string, notificationId: string): Promise<void> {
  const map = await loadReminderMap();
  map[todoId] = notificationId;
  await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(map));
}

/** 获取 todo 的通知 ID */
export async function getTodoReminderNotification(todoId: string): Promise<string | null> {
  const map = await loadReminderMap();
  return map[todoId] ?? null;
}

/** 移除 todo 的通知 ID 并取消该通知 */
export async function clearTodoReminderNotification(todoId: string): Promise<void> {
  const map = await loadReminderMap();
  const id = map[todoId];
  if (id) {
    await cancelReminder(id);
    delete map[todoId];
    await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(map));
  }
}

/** 设置待办提醒并记录通知 ID（Expo Go / 不支持时返回 false，不抛错） */
export async function setTodoReminder(
  todoId: string,
  title: string,
  remindAt: Date
): Promise<boolean> {
  // 先清除旧提醒
  await clearTodoReminderNotification(todoId);
  const id = await scheduleTodoReminder(todoId, title, remindAt);
  if (id) {
    try {
      await setTodoReminderNotification(todoId, id);
    } catch (error) {
      // 补偿：映射未写成功则取消已排期通知，避免幽灵提醒
      await cancelReminder(id).catch(() => {});
      throw error;
    }
    return true;
  }
  return false;
}

async function loadReminderMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_MAP_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// 引用 Platform 避免该模块成为死代码（无害）
void Platform;
