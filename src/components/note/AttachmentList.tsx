import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { AdaptiveImage } from '../common';
import type { Attachment } from '../../constants/theme';

interface AttachmentListProps {
  attachments: Attachment[];
}

/**
 * 附件展示组件
 * 图片点击全屏预览；非图片（文档/音频/视频）点击进入附件预览页
 */
export function AttachmentList({ attachments }: AttachmentListProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const images = attachments.filter((a) => a.type === 'image');
  const files = attachments.filter((a) => a.type !== 'image');

  const openPreview = useCallback((uri: string) => setPreviewUri(uri), []);
  const closePreview = useCallback(() => setPreviewUri(null), []);
  const openAttachment = useCallback(
    (id: string) => router.push(`/attachment/${id}`),
    [router]
  );

  if (attachments.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* 图片网格（自适应宽高比） */}
      {images.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            📎 图片 ({images.length})
          </Text>
          <View style={styles.grid}>
            {images.map((img) => (
              <TouchableOpacity
                key={img.id}
                style={styles.gridItem}
                onPress={() => openPreview(img.file_path)}
                activeOpacity={0.8}
              >
                <AdaptiveImage uri={img.file_path} maxHeight={220} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 非图片附件 */}
      {files.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            📎 附件 ({files.length})
          </Text>
          {files.map((file) => (
            <TouchableOpacity
              key={file.id}
              style={[styles.fileItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openAttachment(file.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {file.file_name}
              </Text>
              <Text style={[styles.fileSize, { color: colors.textDisabled }]}>
                {formatSize(file.file_size)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 图片预览 Modal */}
      <Modal visible={previewUri !== null} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.previewMask}>
          <TouchableOpacity style={styles.previewClose} onPress={closePreview}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewUri && (
            <ScrollView
              contentContainerStyle={styles.previewContent}
              showsVerticalScrollIndicator={false}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const { width: screenWidth } = Dimensions.get('window');
const GAP = spacing.s;
const GRID_ITEM_WIDTH = (screenWidth - spacing.m * 2 - GAP) / 2;

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.l,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.s,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginBottom: spacing.m,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    borderRadius: radius.s,
    overflow: 'hidden',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.s,
  },
  fileIcon: {
    fontSize: fontSize.subtitle,
    marginRight: spacing.s,
  },
  fileName: {
    flex: 1,
    fontSize: fontSize.body,
  },
  fileSize: {
    fontSize: fontSize.small,
    marginLeft: spacing.s,
  },
  previewMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  previewClose: {
    position: 'absolute',
    top: 48,
    right: spacing.m,
    zIndex: 10,
    padding: spacing.s,
  },
  previewCloseText: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  previewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  previewImage: {
    width: screenWidth,
    height: '100%',
  },
});
