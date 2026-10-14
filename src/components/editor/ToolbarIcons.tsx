import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { fontFamily, fontWeight } from '../../theme';

/**
 * 砚台工具栏图标集（18×18、1.5px 描边、单色，仅用 RN 基础组件绘制）
 * 参考《note-demo-开发沟通文档4.0》第六章 6.1 图标规范
 */

const SIZE = 18;
const STROKE = 1.5;

interface ToolbarIconProps {
  color: string;
  /** 仅图标内部使用的强调色（如「字体颜色」A 的色条，用朱砂作功能指示） */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

interface BoxProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function Box({ children, style }: BoxProps) {
  return (
    <View
      style={[
        {
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** [T] 字体 */
export function FontIcon({ color }: ToolbarIconProps) {
  return (
    <Box>
      <Text style={[styles.serifLetter, { color }]}>T</Text>
    </Box>
  );
}

/** [B] 加粗 */
export function BoldIcon({ color }: ToolbarIconProps) {
  return (
    <Box>
      <Text style={[styles.boldLetter, { color }]}>B</Text>
    </Box>
  );
}

/** [≡] 列表（无序列表三横线） */
export function ListIcon({ color }: ToolbarIconProps) {
  return (
    <Box>
      <View style={styles.column}>
        <View style={[styles.row, { backgroundColor: color, marginBottom: 1 }]} />
        <View style={[styles.row, { backgroundColor: color, marginBottom: 1 }]} />
        <View style={[styles.row, { backgroundColor: color }]} />
      </View>
    </Box>
  );
}

/** [A] 字体颜色（色条用朱砂强调） */
export function ColorIcon({ color, accent }: ToolbarIconProps) {
  return (
    <Box>
      <Text style={[styles.colorLetter, { color }]}>A</Text>
      <View style={[styles.colorBar, { backgroundColor: accent || color }]} />
    </Box>
  );
}

/** [图片] */
export function ImageIcon({ color, style }: ToolbarIconProps) {
  return (
    <Box style={style}>
      <View style={[styles.frame, { borderColor: color }]}>
        <View
          style={[
            styles.imgHill,
            {
              borderBottomColor: color,
              borderLeftColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.imgSun,
            {
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </Box>
  );
}

/** [录音] 圆形声波钮 */
export function AudioIcon({ color, style }: ToolbarIconProps) {
  return (
    <Box style={style}>
      <View style={[styles.audioRing, { borderColor: color }]}>
        <View style={[styles.audioDot, { backgroundColor: color }]} />
      </View>
    </Box>
  );
}

/** [回形针] 附件 */
export function AttachIcon({ color, style }: ToolbarIconProps) {
  return (
    <Box style={style}>
      <View style={[styles.clipOuter, { borderColor: color }]}>
        <View style={[styles.clipInner, { borderColor: color }]} />
      </View>
    </Box>
  );
}

/** [链环] 链接 */
export function LinkIcon({ color, style }: ToolbarIconProps) {
  return (
    <Box style={style}>
      <View style={[styles.linkRing, { borderColor: color }]} />
      <View style={[styles.linkRing, styles.linkRingBack, { borderColor: color }]} />
    </Box>
  );
}

/** [···] 更多 */
export function MoreIcon({ color, style }: ToolbarIconProps) {
  return (
    <Box style={style}>
      <Text style={[styles.moreText, { color }]}>⋯</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  serifLetter: {
    fontFamily: fontFamily.serif,
    fontSize: 15,
    lineHeight: 18,
  },
  boldLetter: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.heavy,
    fontSize: 15,
    lineHeight: 18,
  },
  colorLetter: {
    fontFamily: fontFamily.serif,
    fontSize: 13,
    lineHeight: 13,
  },
  colorBar: {
    height: STROKE,
    width: 11,
    borderRadius: 2,
    marginTop: 2,
  },
  column: {
    width: 13,
    justifyContent: 'center',
  },
  row: {
    height: STROKE,
    width: 13,
    borderRadius: 1,
  },
  frame: {
    width: SIZE - 2,
    height: SIZE - 2,
    borderWidth: STROKE,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imgHill: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
    height: 5,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
  },
  imgSun: {
    position: 'absolute',
    right: 3,
    top: 3,
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  audioRing: {
    width: SIZE - 2,
    height: SIZE - 2,
    borderWidth: STROKE,
    borderRadius: (SIZE - 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  clipOuter: {
    width: 7,
    height: SIZE,
    borderWidth: STROKE,
    borderRadius: 5,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  clipInner: {
    position: 'absolute',
    top: 0,
    width: 7,
    height: 9,
    borderLeftWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 8,
  },
  linkRing: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderWidth: STROKE,
    borderRadius: 9,
  },
  linkRingBack: {
    left: 3,
    top: 0,
  },
  moreText: {
    fontFamily: fontFamily.serif,
    fontSize: 15,
    lineHeight: 15,
  },
});
