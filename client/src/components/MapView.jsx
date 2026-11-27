import { CustomOverlayMap, Map, useKakaoLoader } from "react-kakao-maps-sdk";
import { KAKAO_KEY } from "../constants";
import DeviceMarker from "./DeviceMarker.jsx";
import FallbackMap from "./FallbackMap.jsx";

function KakaoMapInner({ devices, selectedId, onSelect, center }) {
  const [loading, error] = useKakaoLoader({ appkey: KAKAO_KEY });

  if (error) {
    return (
      <FallbackMap
        devices={devices}
        selectedId={selectedId}
        onSelect={onSelect}
        notice="카카오맵을 불러오지 못해 간단 지도로 보여드려요."
      />
    );
  }
  if (loading) return <div className="map-loading">지도를 불러오는 중…</div>;

  return (
    <Map center={center} isPanto level={4} style={{ width: "100%", height: "100%" }}>
      {devices.map((d) => (
        <CustomOverlayMap
          key={d.device_id}
          position={{ lat: d.lat, lng: d.lng }}
          xAnchor={0.5}
          yAnchor={0.5}
          zIndex={d.device_id === selectedId ? 10 : d.mock ? 1 : 5}
        >
          <DeviceMarker device={d} selected={d.device_id === selectedId} onSelect={onSelect} />
        </CustomOverlayMap>
      ))}
    </Map>
  );
}

/** 지도가 실패해도 상태 카드는 계속 보이도록, 지도 영역 안에서만 대체 화면으로 전환한다. */
export default function MapView(props) {
  if (!KAKAO_KEY) {
    return <FallbackMap {...props} notice="카카오맵 키가 없어 간단 지도로 보여드려요." />;
  }
  return <KakaoMapInner {...props} />;
}
