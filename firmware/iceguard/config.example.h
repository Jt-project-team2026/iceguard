// 이 파일을 config.h 로 복사한 뒤 값을 채워 사용하세요. (config.h 는 git 에 올라가지 않습니다)
#pragma once

// ---- 네트워크 ----
#define WIFI_SSID     "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"

// 로컬 개발: http://<PC의 IP>:8000   /   배포: https://<서버 도메인>  (끝에 / 를 붙이지 마세요)
#define SERVER_URL    "http://192.168.0.10:8000"
#define API_KEY       "change-me"
#define DEVICE_ID     "iceguard-01"

// ---- 동작 모드 ----
// 1: 시연용 (연속 작동 30초, 휴식 10초)  /  0: 실사용 (연속 작동 10분, 휴식 2분)
#define DEMO_MODE 1

// ---- 핀 ----
#define PIN_HEATER 26   // MOSFET 게이트 (HIGH = 열선 ON)
#define PIN_DHT    4    // DHT22 데이터

// ---- 패드 온도 센서 (DS18B20, 선택) ----
// 1 로 바꾸면 패드 온도를 읽어 서버로 보내고, 60℃ 이상이면 FAULT 로 열선을 끕니다.
// 1 인데 센서 읽기에 실패하면 센서 오류로 취급합니다. (안전 우선)
#define MAT_SENSOR_ENABLED 0
#define PIN_MAT_SENSOR     5

// ---- 주기 (ms) ----
#define SENSOR_INTERVAL_MS 2000   // DHT22 는 최소 2초 간격 필요
#define SEND_INTERVAL_MS   5000   // 서버 전송 간격 (서버는 25초 넘게 안 오면 연결 끊김으로 표시)
#define HTTP_TIMEOUT_MS    15000  // Render 무료 서버가 잠들어 있으면 첫 응답이 느릴 수 있음
