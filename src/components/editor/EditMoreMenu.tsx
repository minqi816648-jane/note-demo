import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import { NoteIcon } from '../common/NoteIcon';
import { CategoryIcon } from '../common/CategoryIcon';
import type { Folder, Category, Tag } from '../../constants/theme';

interface EditMoreMenuProps {
  visible: boolean;
  onClose: () => void;
  /** 展开区域顶部锚点（头部下方） */
  top: number;
  folders: Folder[];
  categories: Category[];
  tags: Tag[];
  noteTagIds: string[];
  folderId: string | null;
  categoryId: string | null;
  isSensitive: boolean;
  onSelectFolder: (id: string | null) => void;
  onSelectCategory: (id: string | null) => void;
  onToggleTag: (tagId: string, name: string) => void;
  onToggleSensitive: (v: boolean) => void;
  onAddFile: () => void;
  onDelete: () => void;
}

type ExpandedKey = 'folder' | 'category' | 'tag';

/**
 * 「···」更多菜单（三维度二级分类）—— 见《note-demo-开发沟通文档4.0》第七章
 * 历史版本 | 文件夹/分类/标签（可展开） | 敏感笔记（隐私强调） | 删除笔记
 */
export function EditMoreMenu({
  visible,
  onClose,
  top,
  folders,
  categories,
  tags,
  noteTagIds,
  folderId,
  categoryId,
  isSensitive,
  onSelectFolder,
  onSelectCategory,
  onToggleTag,
  onToggleSensitive,
  onAddFile,
  onDelete,
}: EditMoreMenuProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<ExpandedKey | null>('folder');

  const activeFolder = folders.find((f) => f.id === folderId);
  const activeCategory = categories.find((c) => c.id === categoryId);

  const toggle = (key: ExpandedKey) => setExpanded((prev) => (prev === key ? null : key));

  const folderName = (id: string | null) => {
    if (!id) return '根目录';
    return folders.find((f) => f.id === id)?.name || '选择文件夹';
  };
  const categoryName = (id: string | null) => {
    if (!id) return '未分类';
    return categories.find((c) => c.id === id)?.name || '未分类';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mask} activeOpacity={1} onPress={onClose} />
      <View
        style={[
          styles.panel,
          { top, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== 附件 ===== */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              onAddFile();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <NoteIcon name="clip" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>附件</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>PDF · Word · txt</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* ===== 文件夹（展开态 朱砂） ===== */}
          <TouchableOpacity style={styles.item} onPress={() => toggle('folder')} activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              <NoteIcon name="folder" size={18} color={colors.primary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>文件夹{expanded === 'folder' ? '' : ' ▸'}</Text>
              <Text style={[styles.hint, { color: folderId ? colors.primary : colors.textSecondary }]}>
                {folderName(folderId)}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>{expanded === 'folder' ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          {expanded === 'folder' && (
            <View style={styles.subList}>
              <TouchableOpacity
                style={[styles.subItem, styles.rootItem]}
                onPress={() => onSelectFolder(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subDot, { backgroundColor: folderId ? colors.textSecondary : colors.primary }]} />
                <Text style={[styles.subText, { color: colors.textPrimary }]}>📂 根目录</Text>
              </TouchableOpacity>
              {folders
                .filter((f) => f.deleted_at === null)
                .map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={styles.subItem}
                    onPress={() => onSelectFolder(folder.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.subDot,
                        { backgroundColor: folder.id === folderId ? colors.primary : colors.textSecondary },
                      ]}
                    />
                    <Text style={[styles.subText, { color: colors.textPrimary }]}>
                      {folder.icon ? `${folder.icon} ` : '📁 '}{folder.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* ===== 分类（可展开） ===== */}
          <TouchableOpacity style={styles.item} onPress={() => toggle('category')} activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              <NoteIcon name="briefcase" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>分类 ▸</Text>
              <Text style={[styles.hint, { color: categoryId ? colors.primary : colors.textSecondary }]}>
                {categoryName(categoryId)}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>{expanded === 'category' ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          {expanded === 'category' && (
            <View style={styles.subList}>
              <TouchableOpacity style={[styles.subItem, styles.rootItem]} onPress={() => onSelectCategory(null)} activeOpacity={0.7}>
                <Text style={[styles.subDot, { backgroundColor: categoryId ? colors.textSecondary : colors.primary }]} />
                <Text style={[styles.subText, { color: colors.textPrimary }]}>无分类</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.subItem}
                  onPress={() => onSelectCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.subDot, { backgroundColor: cat.id === categoryId ? colors.primary : colors.textSecondary }]} />
                  <View style={styles.categorySub}>
                    <CategoryIcon category={cat} size={15} color={colors.textPrimary} />
                    <Text style={[styles.subText, { color: colors.textPrimary, marginLeft: 6 }]}>
                      {cat.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ===== 标签（可展开，多选） ===== */}
          <TouchableOpacity style={styles.item} onPress={() => toggle('tag')} activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              <NoteIcon name="tag" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>标签 ▸</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={1}>
                {noteTagIds.length > 0 ? `${noteTagIds.length} 个标签` : '为笔记添加标签'}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>{expanded === 'tag' ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          {expanded === 'tag' && (
            <View style={styles.subList}>
              {tags.length === 0 ? (
                <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>暂无标签</Text>
              ) : (
                tags.map((tag) => {
                  const active = noteTagIds.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={styles.subItem}
                      onPress={() => onToggleTag(tag.id, tag.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.subDot, { backgroundColor: active ? colors.primary : colors.textSecondary }]} />
                      <Text style={[styles.subText, { color: colors.textPrimary }]}>{tag.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* ===== 隐私：敏感笔记（不上传 AI 分析）===== */}
          <View style={[styles.privacyRow, { backgroundColor: isSensitive ? '#FBF3EC' : 'transparent' }]}>
            <View style={styles.privacyLeft}>
              <NoteIcon name="shield" size={18} color={isSensitive ? colors.primary : colors.textSecondary} />
              <View style={styles.privacyTextWrap}>
                <Text style={[styles.privacyLabel, { color: isSensitive ? colors.primary : colors.textPrimary }]}>
                  不上传 AI 分析
                </Text>
                <Text style={[styles.privacyHint, { color: colors.textSecondary }]}>
                  敏感内容不上传、不用于 AI 分类/摘要/问答
                </Text>
              </View>
            </View>
            <Switch
              value={isSensitive}
              onValueChange={onToggleSensitive}
              trackColor={{ false: colors.border, true: colors.warning }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* ===== 删除 ===== */}
          <TouchableOpacity style={styles.item} onPress={onDelete} activeOpacity={0.7}>
            <View style={styles.iconWrap}>
              <NoteIcon name="trash" size={18} color={colors.danger} />
            </View>
            <Text style={[styles.deleteText, { color: colors.danger }]}>删除笔记</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    right: spacing.m,
    width: 250,
    maxHeight: 420,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  scroll: {
    maxHeight: 416,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.s,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.body,
  },
  hint: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  chevron: {
    fontSize: fontSize.caption,
    marginLeft: spacing.s,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.m,
  },
  subList: {
    paddingLeft: spacing.l + spacing.m + 4,
    paddingRight: spacing.m,
    paddingBottom: spacing.xs,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  rootItem: {
    marginTop: 2,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.s,
  },
  subText: {
    fontSize: fontSize.body,
    flex: 1,
  },
  categorySub: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyHint: {
    fontSize: fontSize.caption,
    paddingVertical: spacing.s,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.s,
  },
  privacyTextWrap: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  privacyLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
  },
  privacyHint: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  deleteText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});
