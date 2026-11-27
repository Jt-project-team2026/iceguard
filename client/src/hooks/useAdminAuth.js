import { useCallback, useState } from "react";
import { fetchEvents } from "../api";

const KEY = "iceguard_admin_pw";

function read() {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** 비밀번호는 탭을 닫으면 사라지는 sessionStorage 에만 보관한다. */
export function useAdminAuth() {
  const [password, setPassword] = useState(read);

  const login = useCallback(async (value) => {
    await fetchEvents(value, { limit: 1 }); // 틀리면 ApiError(401)
    try {
      sessionStorage.setItem(KEY, value);
    } catch {
      /* 저장 실패해도 이번 세션에서는 사용 가능 */
    }
    setPassword(value);
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* 무시 */
    }
    setPassword("");
  }, []);

  return { password, login, logout };
}
