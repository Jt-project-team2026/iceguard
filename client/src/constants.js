export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? "";
export const SHOW_MOCK = (import.meta.env.VITE_SHOW_MOCK ?? "true") !== "false";
export const POLL_MS = 3000;

// TODO: 시연 위치 좌표로 교체 (현재는 동국대 서울캠퍼스 부근의 대략적인 값)
export const CAMPUS_CENTER = { lat: 37.5582, lng: 127.0002 };

export const LEVELS = {
  safe: {
    key: "safe",
    label: "안전",
    color: "#12794A",
    fg: "#FFFFFF",
    soft: "#E3F4EA",
    text: "#0B5A36",
    message: "노면 상태가 양호해요. 안심하고 이동하세요.",
  },
  caution: {
    key: "caution",
    label: "주의",
    color: "#F2B705",
    fg: "#2B2100",
    soft: "#FFF4CC",
    text: "#6B4E00",
    message: "노면이 얼기 시작할 수 있어요. 미끄럼에 주의하세요.",
  },
  danger: {
    key: "danger",
    label: "위험",
    color: "#C62D20",
    fg: "#FFFFFF",
    soft: "#FDE6E3",
    text: "#9E1F15",
    message: "결빙 위험! 미끄러울 수 있으니 천천히 걸으세요.",
  },
  offline: {
    key: "offline",
    label: "연결 끊김",
    color: "#5B6675",
    fg: "#FFFFFF",
    soft: "#F1E6E4",
    text: "#3E4C59",
    message: "장치와 연결이 끊겨 최신 상태를 확인할 수 없어요.",
  },
};

export const HEATER_STATE_LABEL = { OFF: "대기", HEATING: "작동 중", COOLDOWN: "휴식", FAULT: "오류" };

const LEVEL_BY_TEXT = { 안전: "safe", 주의: "caution", 위험: "danger" };

/** 화면에 표시할 단계 키. 연결이 끊겼거나 데이터가 없으면 단계와 상관없이 offline. */
export function levelKeyOf(device) {
  if (!device || !device.online || !device.latest) return "offline";
  return LEVEL_BY_TEXT[device.latest.level] ?? "offline";
}
