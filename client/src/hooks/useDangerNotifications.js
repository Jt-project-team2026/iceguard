import { useCallback, useEffect, useRef, useState } from "react";
import { levelKeyOf } from "../constants";

/** 실제 장치가 '위험'으로 바뀌는 순간 브라우저 알림을 띄운다. (이 탭이 열려 있을 때만 동작) */
export function useDangerNotifications(devices) {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const previous = useRef(new Map());

  useEffect(() => {
    for (const device of devices) {
      if (device.mock) continue;
      const key = levelKeyOf(device);
      const before = previous.current.get(device.device_id);
      if (enabled && key === "danger" && before && before !== "danger") {
        try {
          new Notification("결빙 위험", { body: `${device.name}: 노면이 얼 수 있어요. 미끄럼에 주의하세요.` });
        } catch {
          /* 알림 생성 실패는 무시 */
        }
      }
      previous.current.set(device.device_id, key);
    }
  }, [devices, enabled]);

  const toggle = useCallback(async () => {
    if (!supported) {
      setMessage("이 브라우저는 알림을 지원하지 않아요.");
      return;
    }
    if (enabled) {
      setEnabled(false);
      setMessage("위험 알림을 껐어요.");
      return;
    }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") {
      setEnabled(true);
      setMessage("위험 알림을 켰어요. 이 탭이 열려 있을 때 알려드려요.");
    } else {
      setMessage("브라우저 설정에서 알림을 허용해야 해요.");
    }
  }, [enabled, supported]);

  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(id);
  }, [message]);

  return { enabled, toggle, message };
}
