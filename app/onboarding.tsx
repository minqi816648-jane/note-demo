import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';
import { spacing, radius, fontSize, fontWeight, fontFamily } from '../src/theme';
import { useBottomInset } from '../src/hooks/useSafeArea';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * 引导页 Onboarding —— 见《note-demo-开发沟通文档4.0》4.6
 * 4 步：写一笔 → AI归类 → 问墨问答 → 开始使用（当前演示第 2 步「AI 已为你归类」）
 */

interface OnboardStep {
  key: string;
  title: string;
  subtitle: string;
  /** 步骤插画类型：纸篇 / 归类 / 问墨 / 开始 */
  art: 'write' | 'classify' | 'ask' | 'start';
}

const STEPS: OnboardStep[] = [
  {
    key: 'write',
    title: '写一笔',
    subtitle: '点底部「＋」记下一笔，文字、拍照、语音、附件皆可入纸。',
    art: 'write',
  },
  {
    key: 'classify',
    title: 'AI 已为你归类',
    subtitle: '笔记写下后，AI 自动归类、打标签、生成摘要，工作与生活各归其位。',
    art: 'classify',
  },
  {
    key: 'ask',
    title: '问墨问答',
    subtitle: '翻遍手帖，不如直接问一句。问墨基于你的笔记给出带出处的回答。',
    art: 'ask',
  },
  {
    key: 'start',
    title: '开始使用',
    subtitle: '入口已备好，以水墨为体、纸间为用，写下你的第一笔。',
    art: 'start',
  },
];

const TAG_CHIPS = ['工作', '笔记', '收藏'];

/** 水墨插画（纯 RN 绘制，不用 SVG） */
function WashIllustration({
  kind,
  colors,
  isDark,
}: {
  kind: OnboardStep['art'];
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const accent = colors.primary;

  if (kind === 'classify') {
    // 纸篇 + 飞散分类标签 + 朱砂虚线飞线
    return (
      <View style={styles.artBox} pointerEvents="none">
        <View style={[styles.paper, { backgroundColor: colors.card, borderColor: colors.border }]} />
        {/* 朱砂虚线飞线 → 标签 */}
        <View style={[styles.dashLine, styles.dashLeft, { borderTopColor: accent }]} />
        <View style={[styles.dashLine, styles.dashRight, { borderTopColor: accent }]} />
        <View style={[styles.dashLine, styles.dashBottom, { borderTopColor: accent }]} />
        {TAG_CHIPS.map((label, i) => (
          <View
            key={label}
            style={[
              styles.chip,
              { backgroundColor: colors.card, borderColor: colors.border },
              i === 0 && styles.chipPos0,
              i === 1 && styles.chipPos1,
              i === 2 && styles.chipPos2,
            ]}
          >
            <Text style={[styles.chipText, { color: accent }]}>{label}</Text>
          </View>
        ))}
      </View>
    );
  }

  // 写一笔 / 问墨 / 开始：简洁纸篇 + 印章点缀
  return (
    <View style={styles.artBox} pointerEvents="none">
      <View style={[styles.paper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.paperLine, { backgroundColor: colors.border }]} />
        <View style={[styles.paperLine, { backgroundColor: colors.border }]} />
        <View style={[styles.paperLine, { backgroundColor: colors.border }]} />
      </View>
      {kind === 'ask' && (
        <View style={[styles.sealStamp, { borderColor: accent }]}>
          <Text style={[styles.sealText, { color: accent }]}>问墨</Text>
        </View>
      )}
      {kind === 'start' && (
        <View style={[styles.stampSolid, { backgroundColor: accent }]}>
          <Text style={[styles.stampText, { color: '#FFF' }]}>用</Text>
        </View>
      )}
      {isDark && (
        <View
          style={[styles.glow, { backgroundColor: accent }]}
        />
      )}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insetsBottom = useBottomInset();
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  const [index, setIndex] = useState(0);
  // 演示稿定位到第 2 步（index 1）「AI 已为你归类」
  const [reducedMotion, setReducedMotion] = useState(false);

  // 尊重系统 prefers-reduced-motion（§3.4），降级为静态
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => setReducedMotion(v));
  }, []);

  // 入场渐显（reduced-motion 时静态呈现）
  const fade = React.useRef(new Animated.Value(1)).current;
  const slide = React.useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    if (reducedMotion) {
      fade.setValue(1);
      slide.setValue(0);
      return;
    }
    fade.setValue(0);
    slide.setValue(24);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide, reducedMotion]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const next = useCallback(async () => {
    if (isLast) {
      await setOnboardingCompleted(true);
      router.replace('/tabs');
      return;
    }
    setIndex((prev) => prev + 1);
    animateIn();
  }, [isLast, setOnboardingCompleted, router, animateIn]);

  const skip = useCallback(async () => {
    await setOnboardingCompleted(true);
    router.replace('/tabs');
  }, [setOnboardingCompleted, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View style={[styles.body, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <WashIllustration kind={step.art} colors={colors} isDark={isDark} />

        {/* 步骤墨点连线（4 点横排 + 连线底，当前点朱砂描边白心） */}
        <View style={styles.dotsWrap}>
          <View style={[styles.dotsLink, { backgroundColor: colors.border }]} />
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index
                  ? styles.dotActive
                  : { backgroundColor: colors.border },
                i === index && { borderColor: colors.primary },
              ]}
            >
              {i === index && <View style={[styles.dotCore, { backgroundColor: colors.primary }]} />}
            </View>
          ))}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{step.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{step.subtitle}</Text>
      </Animated.View>

      {/* 底部：跳过 + 印章式下一步 */}
      <View style={[styles.footer, { paddingBottom: insetsBottom + spacing.l }]}>
        <TouchableOpacity onPress={skip} activeOpacity={0.6} accessibilityRole="button">
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>跳过</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={next} activeOpacity={0.85} accessibilityRole="button">
          <View style={[styles.nextSeal, { backgroundColor: colors.primary }]}>
            <Text style={styles.nextText}>{isLast ? '开始使用' : '下一步'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  artBox: {
    width: 240,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  paper: {
    width: 176,
    height: 128,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  paperLine: {
    height: 3,
    borderRadius: 2,
    marginVertical: 8,
    width: '100%',
  },
  sealStamp: {
    position: 'absolute',
    right: 40,
    top: 30,
    width: 52,
    height: 52,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    fontFamily: fontFamily.serif,
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.caption,
    letterSpacing: 1,
  },
  stampSolid: {
    position: 'absolute',
    right: 46,
    bottom: 26,
    width: 44,
    height: 44,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    fontFamily: fontFamily.serif,
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.subtitle,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.18,
  },
  // 归类插画：飞散标签 + 朱砂虚线飞线
  chip: {
    position: 'absolute',
    paddingHorizontal: spacing.s,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipPos0: { left: 14, top: 46 },
  chipPos1: { right: 12, top: 92 },
  chipPos2: { left: 28, bottom: 34 },
  chipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  dashLine: {
    position: 'absolute',
    width: 44,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
  },
  dashLeft: { left: 16, top: 74, transform: [{ rotate: '-12deg' }] },
  dashRight: { right: 14, top: 120, transform: [{ rotate: '12deg' }] },
  dashBottom: { left: 34, bottom: 60, transform: [{ rotate: '-8deg' }] },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  dotsLink: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    width: 112,
    top: 11,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: spacing.s,
    borderWidth: 0,
  },
  dotActive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.title,
    fontWeight: fontWeight.heavy,
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  subtitle: {
    fontSize: fontSize.body,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: spacing.l,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.l,
  },
  skipText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
  },
  nextSeal: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
    borderRadius: radius.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  nextText: {
    color: '#FFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    fontFamily: fontFamily.serif,
    letterSpacing: 2,
  },
});
