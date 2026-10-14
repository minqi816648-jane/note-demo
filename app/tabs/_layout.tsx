import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../src/theme';
import { spacing, fontSize, fontWeight } from '../../src/theme';
import { useBottomInset } from '../../src/hooks/useSafeArea';
import { usePlusSheet } from '../../src/context/PlusSheetContext';
import { useRippleRing } from '../../src/animations';
import { useHomeViewStore } from '../../stores/homeViewStore';
import { NoteIcon, type NoteIconName } from '../../src/components/common/NoteIcon';

/** 各 tab 对应图标（slog 图标集） */
const TAB_ICONS: Record<string, NoteIconName> = {
  index: 'note',
  'ai-chat': 'ai',
  todos: 'todo',
  settings: 'gear',
};

/**
 * 底部导航（自定义 tabBar）：四项 + 中央「记一笔」浮钮
 */
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  const plusSheet = usePlusSheet();
  // 中央「+」激活光环
  const fabRing = useRippleRing();
  // 手帖/链库 模式（联动 TabBar 首项标签与图标）
  const homeMode = useHomeViewStore((s) => s.mode);

  const renderTab = (route: any, index: number) => {
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    // 首项（手帖 tab）：随 手帖/链库 模式切换图标与文案
    const isFirst = index === 0 && route.name === 'index';
    const icon: NoteIconName =
      isFirst && homeMode === 'link' ? 'link' : (TAB_ICONS[route.name] ?? 'note');
    const label = isFirst
      ? homeMode === 'link' ? '链库' : '手帖'
      : (options.title ?? route.name);

    return (
      <TouchableOpacity key={route.key} style={styles.item} onPress={onPress} activeOpacity={0.7}>
        <NoteIcon
          name={icon}
          size={22}
          color={focused ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textSecondary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const routes = state.routes;
  // 前两个 tab（笔记、AI） + 中央「+」 + 后两个 tab（待办、设置）
  const leftTabs = routes.slice(0, 2);
  const rightTabs = routes.slice(2);

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: bottomInset }]}>
      {leftTabs.map((route: any) => renderTab(route, routes.indexOf(route)))}

      <View style={styles.plusSlot}>
        <View style={styles.plusWrap}>
          <Animated.View
            style={[
              styles.fabRing,
              { borderColor: colors.primary },
              fabRing,
            ]}
            pointerEvents="none"
          />
          <TouchableOpacity
            style={[styles.plusButton, { backgroundColor: colors.primary }]}
            onPress={plusSheet.open}
            onLongPress={plusSheet.openRecording}
            delayLongPress={350}
            activeOpacity={0.8}
          >
            <NoteIcon name="plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {rightTabs.map((route: any) => renderTab(route, routes.indexOf(route)))}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: '笔记' }} />
      <Tabs.Screen name="ai-chat" options={{ title: 'AI' }} />
      <Tabs.Screen name="todos" options={{ title: '待办' }} />
      <Tabs.Screen name="settings" options={{ title: '设置' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  tabIcon: {
    fontSize: fontSize.caption,
  },
  tabLabel: {
    fontSize: fontSize.small,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },
  plusSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 2,
  },
  plusButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
  },
  plusText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
});
