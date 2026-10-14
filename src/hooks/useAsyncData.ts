import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncDataOptions<T> {
  /** 是否自动加载（相当于自动调用 load()），默认 true */
  auto?: boolean;
  /** 是否在 mount 时立即加载，仅在 auto=true 时生效，默认 true */
  initialLoad?: boolean;
}

interface AsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 加载 / 重新加载数据 */
  load: () => Promise<void>;
  /** 重置到初始状态 */
  reset: () => void;
  /** 手动整体替换数据 */
  setData: (data: T) => void;
}

/**
 * 统一的数据加载 hook。
 * 封装 data / loading / error / 重新加载 的样板逻辑，
 * 避免每个页面重复手写 isLoading / console.error，并让错误可见、可重试。
 *
 * 示例：
 *   const { data, loading, error, load } = useAsyncData(() => NoteService.getNotes());
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T> | T,
  options: AsyncDataOptions<T> = {}
): AsyncDataResult<T> {
  const { initialLoad = true, auto = true } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 用 ref 持有最新 fetcher，避免 load 因闭包身份变化导致 auto 循环加载
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setDataState(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      console.error('[useAsyncData]', msg, e);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDataState(null);
    setError(null);
    setLoading(false);
  }, []);

  const setData = useCallback((value: T) => {
    setDataState(value);
  }, []);

  // 仅在挂载时自动加载一次，避免依赖 load/fetcher 身份导致无限刷新
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (!auto || !initialLoad) return;
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    load();
  }, [auto, initialLoad, load]);

  return { data, loading, error, load, reset, setData };
}
