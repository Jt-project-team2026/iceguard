import { useCallback, useState } from "react";

const KEY = "iceguard_favorites";

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState(read);

  const toggle = useCallback((id) => {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* 저장 실패는 무시 */
      }
      return next;
    });
  }, []);

  return { ids, toggle };
}
