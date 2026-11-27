import { HEATER_STATE_LABEL, LEVELS, MODE_LABEL, levelKeyOf } from "../constants";
import { ageText, fmtHum, fmtTemp } from "../utils/format";

export default function SummaryCards({ device }) {
  const key = levelKeyOf(device);
  const level = LEVELS[key];
  const latest = device?.latest;
  const offline = key === "offline";

  return (
    <section className="cards" aria-label="선택한 장치 요약">
      <div className="card">
        <h3>현재 단계</h3>
        <p className="card__value">
          <i style={{ background: level.color }} aria-hidden="true" />
          <span style={{ color: level.text }}>{device ? level.label : "—"}</span>
        </p>
      </div>
      <div className="card">
        <h3>열선 상태</h3>
        <p className="card__value">{offline || !latest ? "—" : HEATER_STATE_LABEL[latest.state]}</p>
        <p className="card__sub">
          {offline || !latest ? "알 수 없음" : latest.state}
          {device?.mode && device.mode !== "AUTO" ? ` · 수동(${MODE_LABEL[device.mode]})` : ""}
        </p>
      </div>
      <div className="card">
        <h3>온도 / 습도</h3>
        <p className="card__value">
          {offline || !latest ? "—" : fmtTemp(latest.temp)}
          <small> / {offline || !latest ? "—" : fmtHum(latest.hum)}</small>
        </p>
      </div>
      <div className="card">
        <h3>장치 연결</h3>
        <p className="card__value">
          <i style={{ background: device?.online ? "#12794A" : "#5B6675" }} aria-hidden="true" />
          {device?.online ? "온라인" : "오프라인"}
        </p>
        <p className="card__sub">{latest ? `${ageText(latest.age_sec)} ${device.online ? "수신" : "마지막 수신"}` : "수신 기록 없음"}</p>
      </div>
      <div className="card">
        <h3>패드 온도</h3>
        <p className="card__value">{offline || latest?.mat_temp == null ? "—" : fmtTemp(latest.mat_temp)}</p>
        <p className="card__sub">안전 한계 60℃</p>
      </div>
    </section>
  );
}
