# ESP32 펌웨어

`firmware/iceguard/` 가 Arduino 스케치 폴더입니다.

| 파일 | 역할 |
|---|---|
| `iceguard.ino` | 센서 읽기, 열선 제어, 서버 전송 |
| `iceguard_logic.h` | 결빙 단계 판정 + 열선 상태머신 (Arduino 의존성 없음, PC 테스트 가능) |
| `config.example.h` | 설정 예시 → `config.h` 로 복사해서 사용 (git 제외) |

## 동작 방식

- **2초마다** 센서를 읽고 상태머신을 돌려 MOSFET 을 직접 켜고 끕니다.
- **5초마다** 별도 태스크가 최신 측정값을 `POST /api/readings` 로 보냅니다. 서버/Wi-Fi 가 죽어도 열선 제어는 계속됩니다.
- 부팅 직후 가장 먼저 열선 핀을 LOW 로 만듭니다.
- 센서 읽기 3회 연속 실패, NaN, 범위 밖 값, 패드 온도 60℃ 이상이면 `FAULT` 로 열선을 끕니다. 센서가 다시 정상이면 `OFF` 로 복구합니다.
- 규칙은 [state-machine.md](state-machine.md) 와 같습니다. 읽기 실패 때는 마지막 정상값으로 판단합니다.

## 설치 (Arduino IDE)

1. Arduino IDE 설치 → 설정 → "추가 보드 관리자 URL"에 `https://espressif.github.io/arduino-esp32/package_esp32_index.json` 추가 → 보드 관리자에서 **esp32** (Espressif) 설치
2. 라이브러리 관리자에서 설치: **DHT sensor library** (Adafruit), **Adafruit Unified Sensor**
   (패드 센서 DS18B20 을 쓸 때만 **OneWire**, **DallasTemperature** 추가)
3. `firmware/iceguard/config.example.h` 를 같은 폴더에 `config.h` 로 복사하고 값 입력
   - `WIFI_SSID`, `WIFI_PASSWORD`: **2.4GHz** Wi-Fi (ESP32 는 5GHz 미지원)
   - `SERVER_URL`: 로컬 테스트 `http://<PC의 IP>:8000`, 배포 후 `https://<서버 도메인>`
   - `API_KEY`: 서버 `.env` 의 `API_KEY` 와 같은 값
   - `DEVICE_ID`: 서버에 `seed_device` 로 등록한 ID
4. 보드 **ESP32 Dev Module**, 포트 선택 → 업로드 → 시리얼 모니터 115200

시리얼 모니터 예:
```
[sense] ok   T=1.5 H=86 level=위험 state=HEATING heater=ON
[state] OFF -> HEATING
[net] 전송 OK (201)
```
`[net] 401/404` 는 API_KEY 또는 DEVICE_ID 불일치입니다.

로컬 서버를 쓸 때는 PC 방화벽에서 8000 포트 수신을 허용하고, 서버를 `python manage.py runserver 0.0.0.0:8000` 으로 실행하세요. (`ALLOWED_HOSTS` 에 PC IP 추가 필요)

## 배선

| 부품 | ESP32 | 비고 |
|---|---|---|
| DHT22 DATA | GPIO4 | 3.3V, GND 연결. 모듈형이 아니면 DATA–3.3V 사이 10kΩ 풀업 |
| MOSFET(IRLZ44N) 게이트 | GPIO26 | 직렬 220Ω, 게이트–GND 10kΩ 풀다운 |
| MOSFET 소스 | GND | **ESP32 GND 와 12V 전원 GND 를 반드시 공통으로 연결** |
| MOSFET 드레인 | 열선 (−) | 열선 (+) 는 12V 어댑터 (+) |
| DS18B20 (선택) | GPIO5 | 3.3V–DATA 사이 4.7kΩ 풀업 |

- 12V 라인에는 열선 저항을 측정한 뒤 전류에 맞는 퓨즈를 넣으세요. (전류 = 12V ÷ 저항)
- IRLZ44N 은 로직레벨 MOSFET 이지만 3.3V 게이트 구동에서는 완전히 켜지지 않아 발열할 수 있습니다. 실제 열선으로 켜기 전에 MOSFET 이 뜨거워지는지 확인하세요.

## PC에서 로직 검증 (보드 없이)

```bash
bash firmware/test/run.sh   # g++ 와 python3 필요
```
`server/scripts/simulate.py` 의 상태머신(기준 구현)과 펌웨어 로직에 같은 무작위 입력(센서 오류, 패드 과열, 경계값 포함)을 넣어 결과가 같은지 비교합니다.

## 알려진 한계

- HTTPS 는 `setInsecure()` 로 서버 인증서를 검증하지 않습니다. (시연용. 실제 제품은 루트 인증서 고정 필요)
- 이 코드는 ESP32 보드에서 아직 컴파일/실행해 보지 않았습니다. 첫 업로드 때 에러가 나면 로그를 알려주세요.
