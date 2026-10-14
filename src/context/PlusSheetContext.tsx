import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CreationSheet, CreationInitialState } from '../components/create/CreationSheet';

interface PlusSheetContextValue {
  open: () => void;
  openRecording: () => void;
  close: () => void;
}

const PlusSheetContext = createContext<PlusSheetContextValue | undefined>(undefined);

/**
 * 全局「记一笔」创作浮层 Provider。
 * 任意位置调用 usePlusSheet().open() 弹出半屏创作浮层。
 */
export function PlusSheetProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [initialState, setInitialState] = useState<CreationInitialState>(() => 'initial');

  const open = useCallback(() => {
    setInitialState('initial');
    setVisible(true);
  }, []);
  const openRecording = useCallback(() => {
    setInitialState('recording');
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ open, openRecording, close }),
    [open, openRecording, close]
  );

  return (
    <PlusSheetContext.Provider value={value}>
      {children}
      <CreationSheet visible={visible} initialState={initialState} onClose={close} />
    </PlusSheetContext.Provider>
  );
}

export function usePlusSheet(): PlusSheetContextValue {
  const ctx = useContext(PlusSheetContext);
  if (!ctx) {
    throw new Error('usePlusSheet must be used within PlusSheetProvider');
  }
  return ctx;
}
