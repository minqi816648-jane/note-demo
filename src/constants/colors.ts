// ============================================
// 主题颜色定义 —— 设计令牌
// 定稿方向：《UI设计优化方案》V2 · 水墨为体（日）· 极光为夜（夜）
// 日间 = 宣纸 + 焦墨 + 朱砂；夜间 = 深空 + 极光玻璃
// ============================================

// 亮色模式 · 水墨 SUMI
export const lightColors = {
  // 品牌/强调色
  primary: '#B83A2A', // 朱砂红 —— 按钮、高亮、图标
  secondary: '#8A8272', // 淡墨灰 —— 次级强调
  warning: '#C88435',
  danger: '#B83A2A',
  success: '#3E7C5A',

  // 背景色
  background: '#F6F1E6', // 宣纸白
  card: '#FFFDF7', // 卡片白
  surface: '#FFFDF7',

  // 文字色
  textPrimary: '#1C1B18', // 焦墨黑
  textSecondary: '#8A8272', // 淡墨灰
  textDisabled: '#B8AF9C',

  // 边框/分割线
  border: '#E5DCC8',
  divider: '#E5DCC8',

  // 状态色
  error: '#B83A2A',
  info: '#B83A2A',

  // 纸间融合（AI 页）专用
  gold: '#E8C56A', // 描金高亮
  goldText: '#1C1B18',
  stampBg: '#1C1B18', // 印章/描边黑
  paperBg: '#FFFDF7', // 纸签底色

  // 分类颜色（朱砂适度调整，保持辨识）
  categoryWork: '#B83A2A',
  categoryStudy: '#4A7A5C',
  categoryLife: '#C88435',
  categoryIdea: '#6E5A9E',
  categoryTodo: '#B83A2A',
  categoryFav: '#C9A227',
  categoryFinance: '#3E3A30',

  // 极光三色（日间备用，夜间主力）
  auroraCyan: '#4FD8EB',
  auroraViolet: '#8B7CFF',
  auroraPink: '#FF7AD9',

  // 其他
  overlay: 'rgba(24, 21, 16, 0.44)',
  shadow: '#000000',
  transparent: 'transparent',

  // === P1 扩展页补充 token（日历 / 图库 / 附件 / 分享）===
  // 日历
  calTodayBg: '#F5E2DD', // 今日格底色（淡朱砂）
  calWeekendText: '#B9AF97', // 周末日期色
  calOtherMonthText: '#D4CBB8', // 非当月日期色
  // 图库
  ocrBadgeBg: 'rgba(0,0,0,0.6)', // OCR 角标底
  videoBadgeBg: 'rgba(0,0,0,0.5)', // 视频播放标记/时长底
  galleryFailBg: '#E8E3D8', // 加载失败占位底
  // 附件预览
  docPreviewBg: '#FFFFFF', // 文档预览白底
  toolCardBg: '#FBF7EC', // 工具卡底色
  toolCardBorder: '#E5DCC8', // 工具卡描边
  toolIconBg: '#F6F1E6', // 工具图标底
  // 分享导出
  sheetBg: '#FBF7EC', // sheet 浮层底色
  shareLinkBg: '#F0EBE0', // 分享链接输入底
  copyBtnBg: '#1C1B18', // 复制按钮深墨底
};

// 暗色模式 · 极光 AURORA
export const darkColors = {
  // 品牌/强调色（渐变以 primary 近似，体现极光主调）
  primary: '#8B7CFF', // 极光紫
  secondary: '#4FD8EB', // 极光青
  warning: '#FFC257',
  danger: '#FF7AD9',
  success: '#6CD4B8',

  // 背景色
  background: '#0A0D1F', // 深空黑
  card: 'rgba(255,255,255,0.07)', // 玻璃卡
  surface: 'rgba(13,17,34,0.93)',

  // 文字色
  textPrimary: '#F2F4FF', // 雾白
  textSecondary: '#7F89B4',
  textDisabled: '#5D6890',

  // 边框/分割线
  border: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.14)',

  // 状态色
  error: '#FF7AD9',
  info: '#4FD8EB',

  // 纸间融合（AI 页）专用 —— 夜间转暖金光晕
  gold: 'rgba(255,201,77,0.26)',
  goldText: '#FFE9B3',
  stampBg: 'rgba(255,255,255,0.4)',
  paperBg: 'rgba(255,255,255,0.06)',

  // 分类颜色
  categoryWork: '#8FE7F5',
  categoryStudy: '#6CD4B8',
  categoryLife: '#FFC257',
  categoryIdea: '#C39BEB',
  categoryTodo: '#FF7AD9',
  categoryFav: '#FFD77A',
  categoryFinance: '#9BA3C7',

  // 极光三色
  auroraCyan: '#4FD8EB',
  auroraViolet: '#8B7CFF',
  auroraPink: '#FF7AD9',

  // 其他
  overlay: 'rgba(4,6,14,0.55)',
  shadow: '#000000',
  transparent: 'transparent',

  // === P1 扩展页补充 token（日历 / 图库 / 附件 / 分享）===
  // 日历
  calTodayBg: 'rgba(79,216,235,0.15)', // 今日格底色（极光青淡）
  calWeekendText: '#5A668F', // 周末日期色
  calOtherMonthText: '#5A668F', // 非当月日期色
  // 图库
  ocrBadgeBg: 'rgba(0,0,0,0.6)', // OCR 角标底
  videoBadgeBg: 'rgba(0,0,0,0.5)', // 视频播放标记/时长底
  galleryFailBg: '#1A2040', // 加载失败占位底
  // 附件预览
  docPreviewBg: '#0A0D1F', // 文档预览区底色（深空）
  toolCardBg: 'rgba(255,255,255,0.07)', // 工具卡底色（玻璃）
  toolCardBorder: 'rgba(255,255,255,0.14)', // 工具卡描边
  toolIconBg: 'rgba(255,255,255,0.08)', // 工具图标底
  // 分享导出
  sheetBg: 'rgba(13,17,34,0.93)', // sheet 浮层底色（玻璃）
  shareLinkBg: 'rgba(255,255,255,0.05)', // 分享链接输入底
  copyBtnBg: '#8B7CFF', // 复制按钮（夜=极光紫）
};

export type ThemeColors = typeof lightColors;
export type ThemeMode = 'light' | 'dark';
