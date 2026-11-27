# IceGuard (아이스가드)

ESP32 기반 노면 결빙 감지 및 자동 열선 제어, 웹 모니터링 시스템

동국대학교 어드벤처디자인 기말 프로젝트 · 팀 Serial.begin(9600)

## 개요

온습도 센서(DHT22)로 노면 환경을 측정하고, 결빙 위험 조건이 되면 ESP32가 MOSFET을 통해 12V 열선을 자동으로 켭니다.
측정값과 열선 상태는 서버로 전송되어 웹에서 확인할 수 있습니다.

- **사용자 페이지 (`/`)**: 카카오맵 위에 구간별 안전 단계(안전 / 주의 / 위험 / 연결 끊김) 표시
- **관리자 페이지 (`/admin`)**: 비밀번호 인증 후 장치 상태, 온도·습도 추이, 이벤트 기록 확인
- 열선 제어는 ESP32에서 로컬로 수행하며, 서버는 표시 전용입니다.

## 구조

```
iceguard/
├─ firmware/   ESP32 펌웨어 (Arduino)
├─ server/     Django + DRF API
├─ client/     React (Vite) 웹 프론트엔드
└─ docs/       API 명세, 상태머신, 배선, 배포
```

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 펌웨어 | ESP32 (Arduino), DHT22, MOSFET 제어 |
| 서버 | Django, Django REST Framework, PostgreSQL (로컬은 SQLite) |
| 프론트 | React, React Router, Kakao Map |
| 배포 | Render (서버/DB), Vercel (프론트) |

## 문서

- [API 명세](docs/api-spec.md)
- [상태머신 / 결빙 단계 기준](docs/state-machine.md)

## 보안 안내

WiFi 비밀번호, API 키, 관리자 비밀번호는 저장소에 올리지 않습니다.
`firmware/config.h`, `server/.env`, `client/.env`는 `.gitignore`로 제외되며, 각각의 `*.example` 파일을 복사해 사용합니다.
