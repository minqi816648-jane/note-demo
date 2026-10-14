import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useHeaderTopInset, useBottomInset } from '../../src/hooks/useSafeArea';
import { AttachmentService } from '../../services';
import { NoteIcon } from '../../src/components/common/NoteIcon';
import { AudioCard } from '../../src/components/note/AudioCard';
import { AuroraBackground } from '../../src/components/common';
import * as Sharing from 'expo-sharing';
import * as gbk from 'gbk.js';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { readAsStringAsync, EncodingType, getContentUriAsync } from 'expo-file-system/legacy';
import type { Attachment } from '../../src/constants/theme';

/**
 * 附件预览：图片/音频/视频/PDF/Word/txt 内置预览 + 底部工具条
 */
export default function AttachmentPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const headerTopInset = useHeaderTopInset();
  const bottomInset = useBottomInset();

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadAttachment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const att = await AttachmentService.getAttachmentById(id);
      setAttachment(att);
    } catch {
      setAttachment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadAttachment();
    }, [loadAttachment])
  );

  const kind = attachment ? detectKind(attachment) : 'file';

  // Android 用 ACTION_VIEW「打开方式」选择器（能列出 txt/pdf/word 等查看器）；
  // iOS 无 ACTION_VIEW，回退 expo-sharing（分享/快捷打开）。
  const handleOpenIn = useCallback(async () => {
    if (!attachment) return;
    try {
      if (Platform.OS === 'android') {
        const mime = resolveMime(attachment);
        const contentUri = await getContentUriAsync(attachment.file_path);
        const { startActivityAsync } = await import('expo-intent-launcher');
        await startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: mime,
          flags: 0x00000001, // FLAG_GRANT_READ_URI_PERMISSION
        });
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('提示', '当前设备不支持分享');
        return;
      }
      await Sharing.shareAsync(attachment.file_path, {
        mimeType: resolveMime(attachment),
        dialogTitle: attachment.file_name || '附件',
      });
    } catch (e) {
      Alert.alert('打开失败', (e as Error).message);
    }
  }, [attachment]);

  const handleSave = useCallback(async () => {
    if (!attachment) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('提示', '当前设备不支持保存');
        return;
      }
      await Sharing.shareAsync(attachment.file_path, {
        mimeType: resolveMime(attachment),
        dialogTitle: attachment.file_name || '另存附件',
      });
    } catch (e) {
      Alert.alert('保存失败', (e as Error).message);
    }
  }, [attachment]);

  const handleCopyLink = useCallback(async () => {
    if (!attachment) return;
    try {
      const clipboard = await import('expo-clipboard');
      await clipboard.setStringAsync(attachment.file_path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      Alert.alert('复制失败', (e as Error).message);
    }
  }, [attachment]);

  return (
    <AuroraBackground style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { backgroundColor: '#000000', borderBottomColor: '#333333', paddingTop: headerTopInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <NoteIcon name="left" size={16} />
          <Text style={[styles.backText, { color: '#FFFFFF' }]}>返回</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.fileName, { color: '#FFFFFF' }]} numberOfLines={1}>
            {attachment?.file_name || '附件预览'}
          </Text>
          <Text style={[styles.fileMeta, { color: '#9AA3B8' }]}>
            {attachment ? describeMeta(attachment, kind) : ''}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.body}>
        {loading || !attachment ? (
          <View style={styles.center}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>附件不存在</Text>
            )}
          </View>
        ) : kind === 'image' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.imageScroll} centerContent>
            <Image
              source={{ uri: attachment.file_path }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={attachment.file_name}
            />
          </ScrollView>
        ) : kind === 'audio' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.audioScroll}>
            <AudioCard attachment={attachment} />
          </ScrollView>
        ) : kind === 'video' ? (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              视频预览暂不可用，请用「用其他App打开」
            </Text>
          </View>
        ) : (
          <PreviewFile uri={attachment.file_path} size={attachment.file_size ?? undefined} />
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: spacing.m + bottomInset }]}>
        <View style={styles.toolRow}>
          <ToolButton icon="⬇︎" label="另存" color={colors.textPrimary} iconBg={colors.toolIconBg} cardBg={colors.toolCardBg} borderColor={colors.toolCardBorder} onPress={handleSave} />
          <ToolButton icon="↗" label="用其他App打开" color={colors.textPrimary} iconBg={colors.toolIconBg} cardBg={colors.toolCardBg} borderColor={colors.toolCardBorder} onPress={handleOpenIn} />
          <ToolButton icon={copied ? '✓' : '🔗'} label={copied ? '已复制' : '复制链接'} color={colors.textPrimary} iconBg={colors.toolIconBg} cardBg={colors.toolCardBg} borderColor={colors.toolCardBorder} onPress={handleCopyLink} />
        </View>
      </View>
    </AuroraBackground>
  );
}

const MAX_TXT_BYTES = 2 * 1024 * 1024; // 2MB

function PreviewFile({ uri, size }: { uri: string; size?: number }) {
  const { colors } = useTheme();

  // 超大文本（>2MB）不整体解码渲染，避免内存峰值导致闪退
  if (isTextLike(uri) && (size || 0) > MAX_TXT_BYTES) {
    return (
      <View style={styles.webFallback}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          文本文件过大，请用「用其他App打开」
        </Text>
      </View>
    );
  }

  if (isTextLike(uri)) {
    return <RenderLocalText uri={uri} knownSize={size ?? 0} />;
  }

  return (
    <View style={styles.webFallback}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        文档预览暂不可用，请用「用其他App打开」
      </Text>
    </View>
  );
}

function isTextLike(uri: string): boolean {
  return /\.(txt|md)$/i.test(uri);
}

function RenderLocalText({ uri, knownSize = 0 }: { uri: string; knownSize?: number }) {
  const { colors } = useTheme();
  const [state, setState] = useState<{ type: 'loading' } | { type: 'ok'; chunks: string[]; truncated: boolean } | { type: 'error' }>({ type: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 大小兜底：解码体积强制 ≤2MB，超限截断，杜绝超大数组导致闪退
        const cap = Math.min(knownSize || MAX_TXT_BYTES, MAX_TXT_BYTES);
        let text: string | null = null;
        // ① 原生 UTF-8 读取（无需 Hermes TextDecoder，最稳，规避之前的缓冲/闪退）
        try {
          const s = await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
          // 读取后按字节体积更精确截断（readAsStringAsync 无 position 时读全）
          text = s.indexOf('\uFFFD') >= 0 ? null : s;
        } catch {
          text = null;
        }
        if (text == null) {
          // ② 非 UTF-8（GBK/UTF-16）→ 走原始字节安全解码
          const f = new File(uri);
          const buf = await f.arrayBuffer();
          const u8 = new Uint8Array(buf);
          const bytes = u8.length > cap ? u8.subarray(0, cap) : u8;
          text = decodeSafeText(bytes);
        }
        if (cancelled) return;
        if (text == null) {
          setState({ type: 'error' });
          return;
        }
        const { chunks, truncated } = buildChunks(text);
        setState({ type: 'ok', chunks, truncated });
      } catch (e) {
        if (!cancelled) setState({ type: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [uri, knownSize]);

  if (state.type === 'loading') {
    return (<View style={styles.center}><ActivityIndicator color={colors.primary} /></View>);
  }
  if (state.type === 'error') {
    return (
      <View style={styles.webFallback}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          文本预览失败，请用「用其他App打开」
        </Text>
      </View>
    );
  }
  // 按块渲染（每块一个 <Text>），避免上千个行级 <Text> 节点撑爆 UI 线程
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.txtDoc}>
      {state.chunks.map((para, i) => (
        <Text key={i} selectable allowFontScaling={false} style={[styles.txtLine, { color: colors.textPrimary }]}>
          {para}
        </Text>
      ))}
      {state.truncated && (
        <Text style={[styles.txtTruncate, { color: colors.textSecondary }]}>
          … 内容过长，已截断显示，可「用其他App打开」查看全文
        </Text>
      )}
    </ScrollView>
  );
}

// 保留换行，同时把文本拆成有限块，控制渲染节点数与单节点体积
const MAX_CHUNKS = 400;
const CHUNK_LEN = 1500;
function buildChunks(text: string): { chunks: string[]; truncated: boolean } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let drawn = '';
  const flush = () => {
    if (drawn.length > 0) out.push(drawn);
    drawn = '';
  };
  const pushPiece = (piece: string) => {
    // 超长单行拆成 <= CHUNK_LEN 小节，避免单个超大 <Text> 节点
    while (piece.length > CHUNK_LEN) {
      drawn += piece.slice(0, CHUNK_LEN);
      flush();
      if (out.length >= MAX_CHUNKS) return true; // truncated
      piece = piece.slice(CHUNK_LEN);
    }
    drawn += piece;
    return false;
  };
  for (const ln of lines) {
    const piece = ln === '' ? ' ' : ln;
    if (drawn && (drawn + '\n' + piece).length > CHUNK_LEN) {
      flush();
      if (out.length >= MAX_CHUNKS) return { chunks: out, truncated: true };
    }
    if (drawn && drawn.length > 0) drawn += '\n';
    if (pushPiece(piece)) return { chunks: out, truncated: true };
    if (out.length >= MAX_CHUNKS) return { chunks: out, truncated: true };
  }
  flush();
  return { chunks: out.length === 0 ? [' '] : out, truncated: false };
}

// Hermes 仅内置支持 utf-8 的 TextDecoder；utf-16le/其他编码的 TextDecoder 在 Hermes 上
// 会抛错甚至引发原生崩溃（这就是 txt 一直缓冲后闪退的根因）。这里只用纯 JS 安全解码，
// 绝不再用 TextDecoder('utf-16le') 或 String.fromCharCode.apply(大数组) 这类会撑爆栈的写法。
function decodeSafeText(u8: Uint8Array): string | null {
  // UTF-16 LE BOM
  if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xfe) {
    return decodeUtf16LE(u8.subarray(2));
  }
  // UTF-16 BE BOM
  if (u8.length >= 2 && u8[0] === 0xfe && u8[1] === 0xff) {
    return decodeUtf16BE(u8.subarray(2));
  }
  // UTF-8（Hermes 支持 utf-8）
  let utf8 = '';
  try {
    utf8 = new TextDecoder('utf-8').decode(u8);
  } catch {
    utf8 = '';
  }
  // 含替换符 → 判定为 GBK/GB18030，仅对小文本走安全逐块解码
  if (utf8.indexOf('\uFFFD') >= 0) {
    if (u8.length <= GBK_MAX_BYTES) {
      try {
        return safeGbkDecode(u8);
      } catch {
        return utf8;
      }
    }
    // 大 GBK 无法可靠解码 → 标记失败，引导外部打开
    return null;
  }
  return utf8;
}

const GBK_MAX_BYTES = 512 * 1024; // 仅 512KB 内尝试 GBK 解码

// 逐块拼接，避免 String.fromCharCode.apply(超大数组) 触发栈溢出
function decodeUtf16LE(u8: Uint8Array): string {
  let out = '';
  const chunk = 4096;
  for (let i = 0; i + 1 < u8.length; i += chunk * 2) {
    const end = Math.min(i + chunk * 2, u8.length);
    let part = '';
    for (let j = i; j + 1 < end; j += 2) part += String.fromCharCode(u8[j] | (u8[j + 1] << 8));
    out += part;
  }
  return out;
}

function decodeUtf16BE(u8: Uint8Array): string {
  let out = '';
  const chunk = 4096;
  for (let i = 0; i + 1 < u8.length; i += chunk * 2) {
    const end = Math.min(i + chunk * 2, u8.length);
    let part = '';
    for (let j = i; j + 1 < end; j += 2) part += String.fromCharCode((u8[j] << 8) | u8[j + 1]);
    out += part;
  }
  return out;
}

// GBK/GB18030：拆小块喂给 gbk.js，避免一次性传入大数组
function safeGbkDecode(u8: Uint8Array): string {
  let out = '';
  const chunk = 4096;
  for (let i = 0; i < u8.length; i += chunk) {
    out += gbk.decode(Array.from(u8.subarray(i, i + chunk)));
  }
  return out;
}

interface ToolButtonProps {
  icon: string;
  label: string;
  color: string;
  iconBg: string;
  cardBg: string;
  borderColor: string;
  onPress: () => void;
}

function ToolButton({ icon, label, color, iconBg, cardBg, borderColor, onPress }: ToolButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.toolCard, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}
    >
      <View style={[styles.toolIcon, { backgroundColor: iconBg }]}>
        <Text style={[styles.toolIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={[styles.toolLabel, { color }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function detectKind(a: Attachment): 'image' | 'audio' | 'video' | 'file' {
  if (a.type === 'image') return 'image';
  if (a.type === 'audio') return 'audio';
  if (a.type === 'video') return 'video';
  return 'file';
}

function resolveMime(a: Attachment): string | undefined {
  const names = [a.file_name || '', a.file_path || ''];
  const EXT: Record<string, string> = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json',
    m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4', png: 'image/png',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  };
  // 优先按实际磁盘文件扩展名推断（最可靠），其次按存库文件名
  for (const n of names) {
    const extMatch = /\.([a-z0-9]+)$/i.exec(n);
    if (extMatch && EXT[extMatch[1].toLowerCase()]) return EXT[extMatch[1].toLowerCase()];
  }
  const mime = (a.mime_type || '').toLowerCase();
  if (mime && mime !== 'application/octet-stream') return a.mime_type || undefined;
  return undefined;
}

function describeMeta(a: Attachment, kind: string): string {
  const size = formatSize(a.file_size ?? 0);
  const isPdf = (resolveMime(a) || '').toLowerCase().includes('pdf');
  const typeLabel =
    kind === 'image' ? '图片' : kind === 'audio' ? '录音' : kind === 'video' ? '视频' : isPdf ? 'PDF' : '文档';
  return `${typeLabel} · ${size}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.m, paddingBottom: spacing.m, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.m },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { fontSize: fontSize.caption },
  headerInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: fontSize.body, fontWeight: fontWeight.semiBold },
  fileMeta: { fontSize: fontSize.small, marginTop: 2 },
  headerRight: { width: 40 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSize.body, textAlign: 'center', lineHeight: 22 },
  imageScroll: { alignItems: 'center', justifyContent: 'center', padding: spacing.m, flexGrow: 1 },
  image: { width: '100%', height: '80%', borderRadius: radius.m },
  audioScroll: { padding: spacing.m, justifyContent: 'center', flexGrow: 1 },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  txtDoc: { padding: spacing.m }, txtLine: { fontSize: fontSize.body, lineHeight: 24 },
  txtTruncate: { fontSize: fontSize.small, fontStyle: 'italic', marginTop: spacing.m, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.m, paddingTop: spacing.s, borderTopWidth: StyleSheet.hairlineWidth },
  toolRow: { flexDirection: 'row', gap: spacing.s },
  toolCard: { flex: 1, height: 58, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 4 },
  toolIcon: { width: 24, height: 24, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  toolIconText: { fontSize: 12 },
  toolLabel: { fontSize: 10, fontWeight: fontWeight.medium },
});
