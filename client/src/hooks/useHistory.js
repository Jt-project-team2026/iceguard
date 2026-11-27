import { useEffect } from "react";
import { fetchHistory } from "../api";
import { usePolling } from "./usePolling";

export function useHistory(deviceId, minutes, password, onUnauthorized) {
  const result = usePolling(
    () => (deviceId ? fetchHistory(deviceId, minutes, password) : Promise.resolve([])),
    5000,
    [deviceId, minutes, password],
  );
  useEffect(() => {
    if (result.error?.status === 401) onUnauthorized();
  }, [result.error, onUnauthorized]);
  return result;
}
