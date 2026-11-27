import { useCallback, useEffect, useRef, useState } from "react";

/**
 * fetcher 를 intervalMs 마다 호출한다. 실패해도 마지막 성공 데이터는 유지한다.
 * deps 가 바뀌면 데이터를 비우고 즉시 다시 가져온다.
 */
export function usePolling(fetcher, intervalMs, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const aliveRef = useRef(true);

  const reload = useCallback(async () => {
    try {
      const data = await fetcherRef.current();
      if (aliveRef.current) setState({ data, error: null, loading: false, updatedAt: Date.now() });
    } catch (error) {
      if (aliveRef.current) setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    let timer;
    setState({ data: null, error: null, loading: true, updatedAt: null });
    const tick = async () => {
      await reload();
      if (aliveRef.current) timer = setTimeout(tick, intervalMs);
    };
    tick();
    return () => {
      aliveRef.current = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, reload, ...deps]);

  return { ...state, reload };
}
