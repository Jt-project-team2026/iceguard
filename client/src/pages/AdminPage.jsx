import { useState } from "react";
import AdminLogin from "../components/AdminLogin.jsx";
import ControlPanel from "../components/ControlPanel.jsx";
import DeviceList from "../components/DeviceList.jsx";
import EventLog from "../components/EventLog.jsx";
import HistoryChart from "../components/HistoryChart.jsx";
import MapView from "../components/MapView.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import { CAMPUS_CENTER } from "../constants";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useDevices } from "../hooks/useDevices";
import { useEvents } from "../hooks/useEvents";
import { useHistory } from "../hooks/useHistory";

const RANGES = [
  { minutes: 30, label: "30분" },
  { minutes: 60, label: "1시간" },
  { minutes: 360, label: "6시간" },
];

function Dashboard({ password, onLogout }) {
  const { devices, error: devicesError, reload: reloadDevices } = useDevices();
  const [selectedId, setSelectedId] = useState(null);
  const [minutes, setMinutes] = useState(30);

  const selected = devices.find((d) => d.device_id === selectedId) ?? devices[0] ?? null;
  const history = useHistory(selected && !selected.mock ? selected.device_id : null, minutes, password, onLogout);
  const events = useEvents(password, onLogout);

  return (
    <div className="admin">
      <header className="a-header">
        <div className="a-title">
          <span className="a-logo" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
            </svg>
          </span>
          IceGuard 관제 시스템 <span className="a-sub">/ 관리자</span>
        </div>
        <div className="a-tools">
          <span className="a-refresh">{devicesError ? "연결 재시도 중" : "3초마다 자동 갱신"}</span>
          <button type="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="a-main">
        <SummaryCards device={selected} />

        <div className="a-grid">
          <div className="a-col a-col--left">
            <section className="panel">
              <h2>장치 위치</h2>
              <div className="a-map">
                <MapView
                  devices={devices}
                  selectedId={selected?.device_id}
                  onSelect={setSelectedId}
                  center={selected ? { lat: selected.lat, lng: selected.lng } : CAMPUS_CENTER}
                />
              </div>
            </section>
            <section className="panel">
              <DeviceList devices={devices} selectedId={selected?.device_id} onSelect={setSelectedId} heading="등록된 장치" />
            </section>
          </div>

          <div className="a-col">
            <ControlPanel
              device={selected}
              password={password}
              onUnauthorized={onLogout}
              onChanged={() => {
                reloadDevices();
                events.reload();
              }}
            />

            <section className="panel">
              <div className="panel__head">
                <h2>온도 · 습도 추이{selected ? ` · ${selected.name.replace(" (예시)", "")}` : ""}</h2>
                <div className="seg" role="group" aria-label="조회 기간">
                  {RANGES.map((r) => (
                    <button key={r.minutes} type="button" aria-pressed={minutes === r.minutes} onClick={() => setMinutes(r.minutes)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <HistoryChart
                data={history.data}
                loading={history.loading}
                error={history.error}
                disabledReason={selected?.mock ? "예시 구간은 시뮬레이션 데이터라 기록이 없어요. 실물 장치를 선택하세요." : !selected ? "장치가 없어요." : ""}
              />
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2>이벤트 기록</h2>
                <span className="muted">모든 장치 · 최근 50건</span>
              </div>
              <EventLog events={events.data} loading={events.loading} error={events.error} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  const auth = useAdminAuth();
  if (!auth.password) return <AdminLogin onLogin={auth.login} />;
  return <Dashboard password={auth.password} onLogout={auth.logout} />;
}
