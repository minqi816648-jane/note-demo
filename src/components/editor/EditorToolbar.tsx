import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { actions } from 'react-native-pell-rich-editor';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { FontIcon, BoldIcon, ListIcon, ColorIcon, ImageIcon, AudioIcon, AttachIcon, LinkIcon } from './ToolbarIcons';
import type { RichTextEditorRef } from './RichTextEditor';

export interface EditorToolbarProps {
  /** 编辑器引用（用于调用 registerToolbar 感知选中状态） */
  editorRef?: React.RefObject<RichTextEditorRef | null>;
  onAddImage?: () => void;
  onAddAudio?: () => void;
  onAddFile?: () => void;
  onAddLink?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const FONT_SIZES = [2, 3, 4, 5] as const;

/** 字体颜色预设（日/夜通用，含朱砂主色） */
const COLOR_PRESETS = ['#1C1B18', '#B83A2A', '#3E7C5A', '#C88435', '#6E5A9E', '#4A7A5C'];

/**
 * 砚台工具栏（单行统一图标，分组竖线）—— 见《note-demo-开发沟通文档4.0》6.1
 * [T] [B] [≡] [A] ‖ [图片] [录音] ‖ [附件] ‖ [链接]
 */
export function EditorToolbar({
  editorRef,
  onAddImage,
  onAddAudio,
  onAddFile,
  onAddLink,
  disabled = false,
  style,
}: EditorToolbarProps) {
  const { colors, isDark } = useTheme();
  const iconColor = isDark ? colors.textPrimary : '#1C1B18';
  const accent = colors.primary;
  const [selected, setSelected] = useState<string[]>([]);
  const [fontIndex, setFontIndex] = useState(1);
  const [showColor, setShowColor] = useState(false);
  const colorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 感知编辑区当前格式状态（粗体/列表 高亮）
  useEffect(() => {
    const cb = (items: Array<string | { type: string; value: string }>) => {
      const strings = items.map((it) => (typeof it === 'string' ? it : it.type));
      setSelected(strings);
    };
    editorRef?.current?.registerToolbar(cb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef]);

  useEffect(() => {
    return () => {
      if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
    };
  }, []);

  const isBold = selected.includes(actions.setBold);
  const isList = selected.includes(actions.insertBulletsList);

  const run = useCallback(
    (fn: () => void) => {
      if (disabled) return;
      fn();
    },
    [disabled]
  );

  const handleFont = useCallback(() => {
    const next = (fontIndex + 1) % FONT_SIZES.length;
    setFontIndex(next);
    editorRef?.current?.setFontSize(FONT_SIZES[next]);
  }, [fontIndex, editorRef]);

  // 点击「字体颜色」A：先执行命令并短暂展示色板
  const openColor = useCallback(() => {
    if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
    setShowColor(true);
    editorRef?.current?.setForeColor(COLOR_PRESETS[1]);
    colorTimerRef.current = setTimeout(() => setShowColor(false), 1200);
  }, [editorRef]);

  const pickColor = useCallback(
    (c: string) => {
      if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
      editorRef?.current?.setForeColor(c);
      setShowColor(false);
    },
    [editorRef]
  );

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }, style]}>
      <View style={styles.row}>
        {/* 格式区 */}
        <TouchableOpacity style={styles.item} onPress={() => run(handleFont)} disabled={disabled} activeOpacity={0.6}>
          <FontIcon color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.item}
          onPress={() => run(() => editorRef?.current?.execCommand(actions.setBold))}
          disabled={disabled}
          activeOpacity={0.6}
        >
          <BoldIcon color={isBold ? accent : iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.item}
          onPress={() => run(() => editorRef?.current?.execCommand(actions.insertBulletsList))}
          disabled={disabled}
          activeOpacity={0.6}
        >
          <ListIcon color={isList ? accent : iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => run(openColor)} disabled={disabled} activeOpacity={0.6}>
          <ColorIcon color={iconColor} accent={accent} />
        </TouchableOpacity>

        <View style={[styles.sep, { backgroundColor: colors.border }]} />

        {/* 媒体区 */}
        <TouchableOpacity style={styles.item} onPress={() => run(() => onAddImage?.())} disabled={disabled} activeOpacity={0.6}>
          <ImageIcon color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => run(() => onAddAudio?.())} disabled={disabled} activeOpacity={0.6}>
          <AudioIcon color={iconColor} />
        </TouchableOpacity>

        <View style={[styles.sep, { backgroundColor: colors.border }]} />

        {/* 附件（独立成组） */}
        <TouchableOpacity style={styles.item} onPress={() => run(() => onAddFile?.())} disabled={disabled} activeOpacity={0.6}>
          <AttachIcon color={iconColor} />
        </TouchableOpacity>

        <View style={[styles.sep, { backgroundColor: colors.border }]} />

        {/* 链接（独立成组） */}
        <TouchableOpacity style={styles.item} onPress={() => run(() => onAddLink?.())} disabled={disabled} activeOpacity={0.6}>
          <LinkIcon color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* 字号提示 / 颜色色板浮层 */}
      {showColor && (
        <View style={[styles.palette, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {COLOR_PRESETS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.swatch, { backgroundColor: c, borderColor: colors.border }]}
              onPress={() => pickColor(c)}
              activeOpacity={0.7}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  item: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    marginHorizontal: spacing.xs,
  },
  palette: {
    position: 'absolute',
    right: spacing.m,
    top: -42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
});
