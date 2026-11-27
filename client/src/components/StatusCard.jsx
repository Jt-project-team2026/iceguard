import { HEATER_STATE_LABEL, LEVELS, levelKeyOf } from "../constants";
import { ageText, fmtHum, fmtTemp } from "../utils/format";
import LevelIcon from "./LevelIcon.jsx";

function noteOf(device, key) {
  if (key === "offline") return device.latest ? `마지막 수신 ${ageText(device.latest.age_sec)}` : "아직 수신된 데이터가 없어요.";
  switch (device.latest.state) {
    case "HEATING":
      return "열선이 작동해 노면을 녹이는 중이에요.";
    case "COOLDOWN":
      return "과열 방지를 위해 열선이 잠시 쉬는 중이에요.";
    case "FAULT":
      return "센서 또는 열선에 이상이 감지되어 열선을 멈췄어요.";
    default:
      return key === "caution" ? "열선 대기 중 · 온도가 더 내려가면 작동해요." : "열선 대기 중";
  }
}

export default function StatusCard({ device, favorite, onFavorite, notifyOn, onNotify, onRefresh }) {
  if (!device) {
    return <section className="status-card status-card--empty">표시할 구간이 없어요.</section>;
  }
  const key = levelKeyOf(device);
  const level = LEVELS[key];
  const offline = key === "offline";
  const latest = device.latest;
  const navUrl = `https://map.kakao.com/link/to/${encodeURIComponent(device.name)},${device.lat},${device.lng}`;

  return (
    <section
      className="status-card"
      aria-label={`${device.name} 상태`}
      style={{ "--lv": level.color, "--lv-soft": level.soft, "--lv-text": level.text }}
    >
      <div className="sc-main">
        <div className="sc-head">
          <div>
            <p className="sc-meta">
              {device.mock ? "시뮬레이션 구간" : "실측 구간"} · {latest ? `${ageText(latest.age_sec)} 갱신` : "수신 없음"}
            </p>
            <h2 className="sc-name">{device.name}</h2>
          </div>
          <span className={`sc-badge${device.mock ? " sc-badge--mock" : ""}`}>{device.mock ? "예시 데이터" : "실시간 측정"}</span>
        </div>

        <div className="sc-level">
          <span className="sc-level__icon">
            <LevelIcon levelKey={key} size={24} color={level.fg} />
          </span>
          <div>
            <p className="sc-level__name">{level.label}</p>
            <p className="sc-msg">{level.message}</p>
          </div>
        </div>

        <dl className="sc-stats">
          <div className="sc-stat">
            <dt>온도</dt>
            <dd>{offline ? "—" : fmtTemp(latest.temp)}</dd>
          </div>
          <div className="sc-stat">
            <dt>습도</dt>
            <dd>{offline ? "—" : fmtHum(latest.hum)}</dd>
          </div>
          <div className="sc-stat">
            <dt>열선</dt>
            <dd>{offline ? "—" : HEATER_STATE_LABEL[latest.state] ?? "—"}</dd>
          </div>
        </dl>
        <p className="sc-note">{noteOf(device, key)}</p>
      </div>

      <div className="sc-actions">
        <button type="button" className="sc-act" aria-pressed={favorite} aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기"} onClick={onFavorite}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill={favorite ? "#C62D20" : "none"} stroke={favorite ? "#C62D20" : "currentColor"} strokeWidth="2" strokeLinejoin="round">
            <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
          </svg>
        </button>
        <a className="sc-act sc-act--primary" href={navUrl} target="_blank" rel="noreferrer" aria-label="카카오맵 길찾기 (새 탭)">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l16-7-7 16-2-7z" />
          </svg>
        </a>
        <button type="button" className="sc-act" aria-pressed={notifyOn} aria-label="위험 알림 받기" onClick={onNotify}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z" />
            <path d="M10 21h4" />
          </svg>
        </button>
        <button type="button" className="sc-act" aria-label="지금 새로고침" onClick={onRefresh}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12a8 8 0 11-2.5-5.8M20 4v5h-5" />
          </svg>
        </button>
      </div>
    </section>
  );
}
