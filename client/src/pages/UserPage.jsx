import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DeviceList from "../components/DeviceList.jsx";
import Legend from "../components/Legend.jsx";
import MapView from "../components/MapView.jsx";
import OnlineBadge from "../components/OnlineBadge.jsx";
import SearchBar from "../components/SearchBar.jsx";
import StatusCard from "../components/StatusCard.jsx";
import { CAMPUS_CENTER } from "../constants";
import { useDangerNotifications } from "../hooks/useDangerNotifications";
import { useDevices } from "../hooks/useDevices";
import { useFavorites } from "../hooks/useFavorites";

export default function UserPage() {
  const { devices, error, loading, hasData, reload } = useDevices();
  const favorites = useFavorites();
  const notify = useDangerNotifications(devices);
  const [selectedId, setSelectedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const selected = devices.find((d) => d.device_id === selectedId) ?? devices[0] ?? null;
  const center = useMemo(
    () => (selected ? { lat: selected.lat, lng: selected.lng } : CAMPUS_CENTER),
    [selected?.device_id, selected?.lat, selected?.lng], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const others = devices.filter((d) => d.device_id !== selected?.device_id);

  return (
    <div className="user-page">
      <header className="u-top">
        <button type="button" className="u-iconbtn" aria-label="메뉴" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="u-brand">
          <span className="u-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
            </svg>
          </span>
          <span>
            <strong>IceGuard</strong>
            <small>캠퍼스 결빙 안전 지도</small>
          </span>
        </div>
        <SearchBar devices={devices} onPick={setSelectedId} />
        <button type="button" className="u-iconbtn" aria-label="위험 알림" aria-pressed={notify.enabled} onClick={notify.toggle}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z" />
            <path d="M10 21h4" />
          </svg>
        </button>
        <div className="u-live">
          <OnlineBadge error={error} loading={loading} />
        </div>
      </header>

      {menuOpen && (
        <>
          <button type="button" className="u-backdrop" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />
          <nav className="u-menu" aria-label="메뉴">
            <Link to="/admin" onClick={() => setMenuOpen(false)}>
              관리자 페이지
            </Link>
            <p>'예시' 표시 구간은 시연을 위한 시뮬레이션 데이터예요.</p>
          </nav>
        </>
      )}

      {(error || loading) && (
        <p className="u-banner" role="status">
          {hasData || !error
            ? loading
              ? "서버에 연결하는 중이에요. 처음에는 최대 1분 걸릴 수 있어요."
              : "서버와 연결이 불안정해요. 자동으로 다시 시도해요."
            : "서버에 연결하지 못했어요. 자동으로 다시 시도해요."}
        </p>
      )}
      {notify.message && (
        <p className="u-toast" role="status">
          {notify.message}
        </p>
      )}

      <main className="u-map">
        <Legend />
        <MapView devices={devices} selectedId={selected?.device_id} onSelect={setSelectedId} center={center} />
      </main>

      <aside className="u-side">
        <StatusCard
          device={selected}
          favorite={selected ? favorites.ids.includes(selected.device_id) : false}
          onFavorite={() => selected && favorites.toggle(selected.device_id)}
          notifyOn={notify.enabled}
          onNotify={notify.toggle}
          onRefresh={reload}
        />
        {others.length > 0 && (
          <div className="u-others">
            <DeviceList devices={others} selectedId={selected?.device_id} onSelect={setSelectedId} favorites={favorites.ids} />
          </div>
        )}
      </aside>
    </div>
  );
}
