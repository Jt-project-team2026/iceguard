import { useEffect, useMemo, useState } from "react";
import { fetchDevices } from "../api";
import { CAMPUS_CENTER, POLL_MS, SHOW_MOCK } from "../constants";
import { createMockDevices, jitterMock } from "../mock/mockDevices";
import { usePolling } from "./usePolling";

/** 서버의 실제 장치(실시간) + 화면 전용 예시 장치(목데이터)를 합쳐서 돌려준다. */
export function useDevices() {
  const polled = usePolling(fetchDevices, POLL_MS);
  const [mocks, setMocks] = useState(() => (SHOW_MOCK ? createMockDevices() : []));

  useEffect(() => {
    if (!SHOW_MOCK) return undefined;
    const id = setInterval(() => setMocks((list) => list.map(jitterMock)), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const devices = useMemo(() => {
    const real = (polled.data ?? []).map((d) =>
      // 좌표를 아직 입력하지 않은 장치(0,0)는 기본 위치에 표시
      d.lat === 0 && d.lng === 0 ? { ...d, lat: CAMPUS_CENTER.lat, lng: CAMPUS_CENTER.lng } : d,
    );
    return [...real, ...mocks];
  }, [polled.data, mocks]);

  return {
    devices,
    error: polled.error,
    loading: polled.loading && !polled.data,
    hasData: polled.data !== null,
    updatedAt: polled.updatedAt,
    reload: polled.reload,
  };
}
