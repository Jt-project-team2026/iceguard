# API 명세

모든 오류 응답 형식: `{ "ok": false, "error": "CODE", "message": "설명" }`

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/readings` | `x-api-key` | ESP32 측정값 업로드. 미등록 장치는 404 `UNKNOWN_DEVICE` |
| GET | `/api/devices` | 없음 | 장치 목록 + 최신값 + 온라인 여부 (사용자 지도, 관리자 공용) |
| POST | `/api/devices/<device_id>/command` | `x-admin-password` | 관리자 수동 제어 (자동 / 강제 켜기 / 강제 끄기) |
| GET | `/api/history?device_id&minutes` | `x-admin-password` | 온도·습도 추이 (최대 360 포인트) |
| GET | `/api/events?device_id&limit` | `x-admin-password` | 이벤트 기록 (device_id 선택) |
| GET | `/api/health` | 없음 | 서버 깨우기용 |

## POST /api/readings 요청

```json
{ "device_id": "iceguard-01", "temp": 1.5, "hum": 86, "level": "위험", "heater": true, "state": "HEATING", "mat_temp": 42.1 }
```

`mat_temp`는 패드 온도 센서(DS18B20)가 없으면 null.

응답 (201): 장치는 `command` 를 읽어 열선 제어에 반영한다. (`remaining_sec` 는 서버 시계가 아니라 "지금부터 남은 초"라서 장치에 시계가 없어도 된다)

```json
{ "ok": true, "data": { "ts": 1795741770332, "events": ["HEATER_ON"], "command": { "mode": "AUTO", "remaining_sec": 0 } } }
```

## POST /api/devices/<device_id>/command (관리자)

```json
{ "mode": "FORCE_ON", "duration_sec": 60 }
```

| mode | 의미 |
|---|---|
| `AUTO` | 자동 (기본). `duration_sec` 무시 |
| `FORCE_ON` | 조건과 상관없이 열선 켜기 |
| `FORCE_OFF` | 조건과 상관없이 열선 끄기 |

- `duration_sec`: 10~600, 기본 60. 강제 모드는 이 시간이 지나면 자동으로 `AUTO` 로 돌아간다. (서버가 죽어도 열선이 계속 켜져 있지 않게 하는 안전장치)
- 응답: `{ "ok": true, "data": { "device_id": "iceguard-01", "mode": "FORCE_ON", "remaining_sec": 60 } }`
- 서버는 모드를 저장만 한다. 장치가 다음 측정값 업로드(최대 5초 뒤)의 응답에서 받아 적용한다.
- 모드가 바뀌거나 시간 만료로 돌아오면 이벤트 `MODE_CHANGED` 가 기록된다.
- 미등록 장치는 404 `UNKNOWN_DEVICE`, 값이 잘못되면 400 `INVALID_INPUT`.

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
      "online": true,
      "mode": "AUTO",
      "mode_remaining_sec": 0
    }
  ]
}
```

- `online`: 마지막 수신 후 `OFFLINE_SEC`(기본 25초) 이내이면 true
- 시각(`ts`)은 서버 수신 시각(epoch ms)
