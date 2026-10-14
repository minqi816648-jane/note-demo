import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useHeaderTopInset } from '../../src/hooks/useSafeArea';
import { useNoteStore } from '../../stores/noteStore';
import { CategoryService } from '../../services';
import { NoteIcon } from '../../src/components/common/NoteIcon';
import { ConfirmDialog } from '../../src/components/common';
import { CATEGORY_ICON_OPTIONS } from '../../src/components/common/CategoryIcon';
import type { Category } from '../../src/constants/theme';

const PRESET_COLORS = [
  '#4A90D9', '#50BFA5', '#F5A623', '#B37FEB', '#E54D2E', '#2E8B57',
  '#E0568F', '#3E8BE0', '#9B5DE5', '#F28C28', '#12A5A0', '#6B7A99',
];

/**
 * 分类编辑页
 * 用于新建 / 编辑「工作、学习」等分类（名称 / 图标 / 颜色），自定义分类可删除。
 * 长按列表页的分类标签即可进入。
 */
export default function CategoryEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const {
    categories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useNoteStore();

  const isNew = !id || id === 'new';
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(isNew ? false : true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 编辑态：加载现有分类数据
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    CategoryService.getCategoryById(id).then((cat) => {
      if (cat) {
        setName(cat.name);
        setIcon(cat.icon);
        setColor(cat.color || PRESET_COLORS[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, isNew]);

  const existing = isNew ? null : categories.find((c: Category) => c.id === id) ?? null;

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('提示', '请输入分类名称');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createCategory({ name: trimmed, icon, color, is_system: 0 });
      } else if (id) {
        await updateCategory(id, { name: trimmed, icon, color });
      }
      router.back();
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [name, icon, color, isNew, id, createCategory, updateCategory, router]);

  const handleDelete = useCallback(() => {
    if (!id || isNew) return;
    setShowDeleteConfirm(true);
  }, [id, isNew]);

  const confirmDelete = useCallback(async () => {
    if (!id || isNew) return;
    try {
      await deleteCategory(id);
      router.back();
    } catch (error) {
      Alert.alert('删除失败', (error as Error).message);
      setShowDeleteConfirm(false);
    }
  }, [id, isNew, deleteCategory, router]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>取消</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isNew ? '新建分类' : '编辑分类'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: fontWeight.semiBold }]}>
              保存
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.bodyContent}
      >
        {/* 名称 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>名称</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="如：工作、学习、生活"
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
          maxLength={20}
        />

        {/* 图标选择（线标） */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>图标</Text>
        <View style={styles.iconGrid}>
          {CATEGORY_ICON_OPTIONS.map((opt) => {
            const active = icon === opt.name;
            return (
              <TouchableOpacity
                key={opt.name}
                style={[
                  styles.iconCell,
                  { backgroundColor: colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
                onPress={() => setIcon(active ? null : opt.name)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt.label}
              >
                <NoteIcon
                  name={opt.name}
                  size={22}
                  color={active ? colors.primary : colors.textPrimary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 颜色选择 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>颜色</Text>
        <View style={styles.colorRow}>
          {PRESET_COLORS.map((c) => {
            const active = color === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  active && styles.colorDotActive,
                ]}
                onPress={() => setColor(c)}
                activeOpacity={0.8}
              />
            );
          })}
        </View>

        {/* 删除（系统分类允许重命名，但删除需谨慎；自定义分类可删除） */}
        {!isNew && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.danger }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Text style={[styles.deleteText, { color: colors.danger }]}>删除此分类</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        iconName="trash"
        danger
        title="删除分类"
        message={`确定删除「${existing?.name || '该分类'}」吗？该分类下的笔记将变为「无分类」。`}
        confirmLabel="删除"
        onConfirm={confirmDelete}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerButtonText: { fontSize: fontSize.body },
  headerTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semiBold,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.m, paddingBottom: spacing.xxl },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.m,
  },
  input: {
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    fontSize: fontSize.body,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#1C1B18',
  },
  deleteBtn: {
    marginTop: spacing.xl,
    borderRadius: radius.m,
    borderWidth: 1,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});
