import { create } from 'zustand';
import type { LinkHomeMode } from '../src/components/link/SegSwitch';

interface HomeViewState {
  /** 手帖主页双视图：note=手帖 / link=链库 */
  mode: LinkHomeMode;
  setMode: (mode: LinkHomeMode) => void;
}

/**
 * 手帖主页「手帖丨链库」双视图模式（UI 状态，无需持久化）。
 * 供 tabs/index 内容区与 tabs/_layout 底部导航标签联动使用。
 */
export const useHomeViewStore = create<HomeViewState>((set) => ({
  mode: 'note',
  setMode: (mode) => set({ mode }),
}));
