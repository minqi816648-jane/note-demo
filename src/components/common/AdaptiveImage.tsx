import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface AdaptiveImageProps {
  uri: string;
  /** 容器可用宽度（像素）。默认为占满父容器 */
  width?: number;
  /** 高度上限（像素），超出则压缩到上限并等比缩放 */
  maxHeight?: number;
  /** 加载中占位高度（未拿到尺寸前） */
  placeholderHeight?: number;
  style?: StyleProp<ViewStyle>;
  /** 图片懒加载：false 时仅渲染占位（不发起解码），进入可视区后置 true 再加载 */
  inView?: boolean;
}

/**
 * 自适应图片：在给定容器宽度内，按原图宽高比计算高度完整显示，不裁切。
 * 拿到原生尺寸后以 aspectRatio 渲染；未拿到前显示占位高度。
 * 懒加载：inView=false 时跳过 Image.getSize 与解码（内存/解码节省），
 * 待进入可视区（inView=true）才加载。
 */
export function AdaptiveImage({
  uri,
  width,
  maxHeight,
  placeholderHeight = 72,
  style,
  inView = true,
}: AdaptiveImageProps) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // 是否允许加载（默认 true；inView=false 时暂停，进入可视区后开启）
  const shouldLoad = inView;

  useEffect(() => {
    let cancelled = false;
    setRatio(null);
    setSize(null);
    if (!uri || !shouldLoad) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (cancelled || !w || !h) return;
        setSize({ w, h });
        setRatio(h / w);
      },
      () => {
        /* 取尺寸失败：保持 null，回退占位 */
      }
    );
    return () => { cancelled = true; };
  }, [uri, shouldLoad]);

  return (
    <View style={[styles.wrap, style]}>
      {shouldLoad && size && ratio ? (
        <Image
          source={{ uri } as ImageSourcePropType}
          style={[
            { width: width ? width : '100%', aspectRatio: 1 / ratio },
            maxHeight ? { maxHeight } : null,
          ]}
          resizeMode="cover"
          accessibilityRole="image"
        />
      ) : (
        <View style={[styles.placeholder, { height: placeholderHeight }]}>
          <ActivityIndicator color="#8A8272" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
