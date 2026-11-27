const pad = (n) => String(n).padStart(2, "0");

export const fmtTemp = (v) => (v == null ? "—" : `${v.toFixed(1)}℃`);
export const fmtHum = (v) => (v == null ? "—" : `${Math.round(v)}%`);

export function ageText(sec) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  return `${Math.floor(sec / 3600)}시간 전`;
}

export function fmtClock(ts, withSeconds = true) {
  const d = new Date(ts);
  const base = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

/** 오늘이면 시각만, 아니면 날짜까지 */
export function fmtDateClock(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? fmtClock(ts) : `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${fmtClock(ts)}`;
}
