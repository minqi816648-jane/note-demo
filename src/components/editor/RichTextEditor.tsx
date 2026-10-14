import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import { useTheme } from '../../theme';
import { buildMediaCardCss } from '../../utils/mediaCards';

export type ToolbarItem = string | { type: string; value: string };

export interface RichTextEditorRef {
  getHTML: () => Promise<string>;
  setHTML: (html: string) => void;
  insertImage: (url: string) => void;
  insertLink: (url: string, title?: string) => void;
  focus: () => void;
  blur: () => void;
  /** 插入一段 HTML 块（如 .nk-card 媒体卡片） */
  insertHTMLBlock: (html: string) => void;
  /** 触发编辑区域格式命令（bold / unorderedList / fontSize / foreColor 等） */
  execCommand: (action: actions) => void;
  /** 设置选中文字颜色 */
  setForeColor: (color: string) => void;
  /** 设置字号（1=10 … 7=48） */
  setFontSize: (size: 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  /** 注册工具栏选中状态监听 */
  registerToolbar: (cb: (items: ToolbarItem[]) => void) => void;
}

export interface RichTextEditorProps {
  initialHTML?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  onHeightChange?: (height: number) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ initialHTML = '', placeholder = '开始输入...', onChange, onHeightChange, style, disabled = false }, ref) => {
    const { colors, isDark } = useTheme();
    const editorRef = useRef<RichEditor>(null);

    useImperativeHandle(ref, () => ({
      getHTML: async () => {
        const html = await editorRef.current?.getContentHtml();
        return html || '';
      },
      setHTML: (html: string) => editorRef.current?.setContentHTML(html),
      insertImage: (url: string) => editorRef.current?.insertImage(url),
      insertLink: (url: string, title?: string) => editorRef.current?.insertLink(url, title || url),
      focus: () => editorRef.current?.focusContentEditor(),
      blur: () => editorRef.current?.blurContentEditor(),
      insertHTMLBlock: (html: string) => {
        editorRef.current?.sendAction('html', 'result', html);
      },
      execCommand: (action: actions) => editorRef.current?.sendAction(action, 'result'),
      setForeColor: (color: string) => editorRef.current?.setForeColor(color),
      setFontSize: (size: 1 | 2 | 3 | 4 | 5 | 6 | 7) => editorRef.current?.setFontSize(size),
      registerToolbar: (cb: (items: ToolbarItem[]) => void) =>
        editorRef.current?.registerToolbar(cb),
    }));

    const handleChange = useCallback(
      (html: string) => {
        onChange?.(html);
      },
      [onChange]
    );

    return (
      <View style={[styles.container, style]}>
        <RichEditor
          ref={editorRef}
          initialContentHTML={initialHTML}
          placeholder={placeholder}
          onChange={handleChange}
          onHeightChange={onHeightChange}
          disabled={disabled}
          allowFileAccess={true}
          editorStyle={{
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            placeholderColor: colors.textDisabled,
            contentCSSText: `
              font-size: 15px;
              line-height: 22px;
              padding: 16px;
              img {
                display: block;
                max-width: 100%;
                height: auto;
                border-radius: 12px;
                margin: 12px 0;
                background: ${colors.border}22;
              }
              a { color: ${colors.primary}; text-decoration: underline; }
              ${buildMediaCardCss(colors, isDark)}
            `,
          }}
          style={styles.editor}
        />
      </View>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

const styles = StyleSheet.create({
  container: {
    minHeight: 200,
  },
  editor: {
    minHeight: 200,
  },
});
