import DeviceMarker from "./DeviceMarker.jsx";

/** 카카오맵을 쓸 수 없을 때(키 없음/로드 실패)도 핀과 상태를 볼 수 있게 하는 간단 지도 */
export default function FallbackMap({ devices, selectedId, onSelect, notice }) {
  const lats = devices.map((d) => d.lat);
  const lngs = devices.map((d) => d.lng);
  const minLat = Math.min(...lats);
  const minLng = Math.min(...lngs);
  const spanLat = Math.max(Math.max(...lats) - minLat, 0.003);
  const spanLng = Math.max(Math.max(...lngs) - minLng, 0.003);
  // 가장자리에 핀이 붙지 않도록 12% 여백
  const place = (d) => ({
    left: `${12 + ((d.lng - minLng) / spanLng) * 76}%`,
    top: `${88 - ((d.lat - minLat) / spanLat) * 76}%`,
  });

  return (
    <div className="fmap" role="group" aria-label="구간 위치 (간단 지도)">
      <svg className="fmap__bg" aria-hidden="true" viewBox="0 0 900 756" preserveAspectRatio="xMidYMid slice">
        <rect width="900" height="756" fill="#F4E6E3" />
        <rect x="40" y="500" width="260" height="200" rx="28" fill="#E1E7D3" />
        <g fill="#EBD3CE">
          <rect x="40" y="60" width="200" height="130" rx="14" />
          <rect x="40" y="210" width="200" height="120" rx="14" />
          <rect x="360" y="60" width="150" height="110" rx="14" />
          <rect x="540" y="60" width="180" height="150" rx="14" />
          <rect x="740" y="60" width="130" height="190" rx="14" />
          <rect x="360" y="420" width="150" height="150" rx="14" />
          <rect x="740" y="290" width="130" height="150" rx="14" />
          <rect x="560" y="520" width="200" height="170" rx="14" />
        </g>
        <g stroke="#fff" strokeLinecap="round" fill="none">
          <path d="M-10 360 L910 300" strokeWidth="24" />
          <path d="M300 20 L330 740" strokeWidth="20" />
          <path d="M440 740 Q470 520 520 330" strokeWidth="24" />
          <path d="M520 330 L720 250" strokeWidth="16" />
        </g>
      </svg>
      {devices.map((d) => (
        <div key={d.device_id} className="fmap__pin" style={place(d)}>
          <DeviceMarker device={d} selected={d.device_id === selectedId} onSelect={onSelect} />
        </div>
      ))}
      <p className="fmap__note">{notice ?? "간단 지도"}</p>
    </div>
  );
}
