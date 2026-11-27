# API 명세

모든 오류 응답 형식: `{ "ok": false, "error": "CODE", "message": "설명" }`

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/readings` | `x-api-key` | ESP32 측정값 업로드. 미등록 장치는 404 `UNKNOWN_DEVICE` |
| GET | `/api/devices` | 없음 | 장치 목록 + 최신값 + 온라인 여부 (사용자 지도, 관리자 공용) |
| GET | `/api/history?device_id&minutes` | `x-admin-password` | 온도·습도 추이 (최대 360 포인트) |
| GET | `/api/events?device_id&limit` | `x-admin-password` | 이벤트 기록 (device_id 선택) |
| GET | `/api/health` | 없음 | 서버 깨우기용 |

## POST /api/readings 요청

```json
{ "device_id": "iceguard-01", "temp": 1.5, "hum": 86, "level": "위험", "heater": true, "state": "HEATING", "mat_temp": 42.1 }
```

`mat_temp`는 패드 온도 센서(DS18B20)가 없으면 null.

## GET /api/devices 응답

```json
{
  "ok": true,
  "data": [
    {
      "device_id": "iceguard-01",
      "name": "정문 오르막",
      "lat": 0.0,
      "lng": 0.0,
      "latest": { "ts": 0, "temp": 1.5, "hum": 86, "level": "위험", "heater": true, "state": "HEATING", "mat_temp": 42.1, "age_sec": 3 },
      "online": true
    }
  ]
}
```

- `online`: 마지막 수신 후 `OFFLINE_SEC`(기본 25초) 이내이면 true
- 시각(`ts`)은 서버 수신 시각(epoch ms)
