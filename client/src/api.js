import { API_BASE } from "./constants";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { adminPassword, method = "GET", body: payload } = {}) {
  let response;
  try {
    const headers = adminPassword ? { "x-admin-password": adminPassword } : {};
    if (payload !== undefined) headers["Content-Type"] = "application/json";
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "서버에 연결할 수 없어요.");
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* JSON이 아닌 응답은 아래에서 오류로 처리 */
  }
  if (!response.ok || !body?.ok) {
    throw new ApiError(response.status, body?.error ?? "ERROR", body?.message ?? `요청에 실패했어요 (${response.status})`);
  }
  return body.data;
}

export const fetchDevices = () => request("/api/devices");

export const fetchHistory = (deviceId, minutes, adminPassword) =>
  request(`/api/history?device_id=${encodeURIComponent(deviceId)}&minutes=${minutes}`, { adminPassword });

export const fetchEvents = (adminPassword, { deviceId, limit = 50 } = {}) => {
  const params = new URLSearchParams({ limit });
  if (deviceId) params.set("device_id", deviceId);
  return request(`/api/events?${params}`, { adminPassword });
};

/** 관리자 수동 제어. mode: "AUTO" | "FORCE_ON" | "FORCE_OFF", durationSec: 10~600 (강제 모드 유지 시간) */
export const sendCommand = (deviceId, mode, durationSec, adminPassword) =>
  request(`/api/devices/${encodeURIComponent(deviceId)}/command`, {
    adminPassword,
    method: "POST",
    body: { mode, duration_sec: durationSec },
  });
