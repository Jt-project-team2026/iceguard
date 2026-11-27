import { useEffect } from "react";
import { fetchEvents } from "../api";
import { usePolling } from "./usePolling";

export function useEvents(password, onUnauthorized, limit = 50) {
  const result = usePolling(() => fetchEvents(password, { limit }), 5000, [password, limit]);
  useEffect(() => {
    if (result.error?.status === 401) onUnauthorized();
  }, [result.error, onUnauthorized]);
  return result;
}
