import { fmtDateClock } from "../utils/format";

const TYPES = {
  HEATER_ON: { label: "열선 켜짐", tone: "danger" },
  HEATER_OFF: { label: "열선 꺼짐", tone: "safe" },
  COOLDOWN: { label: "휴식", tone: "neutral" },
  FAULT: { label: "오류", tone: "caution" },
  RECOVERED: { label: "복구", tone: "info" },
  MODE_CHANGED: { label: "수동 제어", tone: "info" },
};

export default function EventLog({ events, loading, error }) {
  if (error && !events) return <p className="log-empty">{error.message}</p>;
  if (loading || !events) return <p className="log-empty">불러오는 중…</p>;
  if (events.length === 0) return <p className="log-empty">아직 기록된 이벤트가 없어요.</p>;

  return (
    <div className="log-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">시각</th>
            <th scope="col">장치</th>
            <th scope="col">이벤트</th>
            <th scope="col">상세</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const type = TYPES[e.type] ?? { label: e.type, tone: "neutral" };
            return (
              <tr key={e.id}>
                <td className="muted">{fmtDateClock(e.ts)}</td>
                <td>{e.device_name}</td>
                <td>
                  <span className={`tag tag--${type.tone}`}>{type.label}</span>
                </td>
                <td>{e.detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
