import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ToastView, ToastData, ToastType } from '../components/common/Toast';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastIdSeq = 0;

/**
 * 全局气泡提示 Provider。挂载在根布局，任意位置 useToast().showToast(msg, type)。
 * 自动管理单条显示 / 定时消失（动画由 ToastView 驱动，key 切换 id 重启动画）。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ id: ++toastIdSeq, message, type });
  }, []);

  const handleDone = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={handleDone} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
