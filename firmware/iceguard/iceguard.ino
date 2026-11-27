// IceGuard (아이스가드) ESP32 펌웨어
//
// 역할
//   1) DHT22 로 온도/습도를 읽고 (선택: DS18B20 으로 패드 온도)
//   2) 결빙 단계와 열선 상태머신을 ESP32 안에서 계산해 MOSFET 을 직접 제어하고
//   3) 측정값을 서버(POST /api/readings)로 보낸다.
//   4) 서버 응답에 실린 관리자 수동 명령(자동/강제 켜기/강제 끄기)을 받아 적용한다.
//      수동 명령은 시간 제한이 있고, 과열·센서 오류·연속 작동 한도 같은 안전 규칙이 항상 우선한다.
//
// 안전 원칙: 열선 제어는 네트워크와 무관하다. Wi-Fi/서버가 죽어도 센서 → 열선 제어는 계속된다.
// 그래서 서버 전송은 별도 FreeRTOS 태스크에서 하고, loop() 는 절대 네트워크를 기다리지 않는다.
//
// 필요한 라이브러리 (Arduino IDE 라이브러리 관리자)
//   - "DHT sensor library" (Adafruit)  + "Adafruit Unified Sensor"
//   - (패드 센서를 쓸 때만) "OneWire", "DallasTemperature"
// 보드: ESP32 Dev Module

#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#if __has_include("config.h")
#include "config.h"
#else
#error "config.h 가 없습니다. config.example.h 를 config.h 로 복사해서 값을 채워 주세요."
#endif

#include <DHT.h>
#include "iceguard_logic.h"

#if MAT_SENSOR_ENABLED
#include <DallasTemperature.h>
#include <OneWire.h>
static OneWire oneWire(PIN_MAT_SENSOR);
static DallasTemperature matSensor(&oneWire);
#endif

#if DEMO_MODE
static ig::HeaterMachine machine(30UL * 1000, 10UL * 1000);
#else
static ig::HeaterMachine machine(600UL * 1000, 120UL * 1000);
#endif

static DHT dht(PIN_DHT, DHT22);

// 제어 루프가 만든 최신 측정값. 전송 태스크가 복사해 간다.
struct Snapshot {
  bool valid = false;  // 정상 측정값을 한 번이라도 얻었는가
  float temp = NAN;
  int hum = 0;
  ig::Level level = ig::Level::SAFE;
  bool heater = false;
  ig::State state = ig::State::OFF;
  float mat = NAN;
};
static Snapshot g_snap;

// 서버가 내려준 수동 모드. 전송 태스크가 쓰고 제어 루프가 읽는다.
struct PendingCommand {
  ig::Mode mode = ig::Mode::AUTO;
  uint32_t untilMs = 0;  // millis() 기준
};
static PendingCommand g_cmd;
static SemaphoreHandle_t g_mutex;

static void setHeater(bool on) { digitalWrite(PIN_HEATER, on ? HIGH : LOW); }

// ---------------------------------------------------------------- 센서

static bool readSensors(float &temp, float &hum, float &mat) {
  const float t = dht.readTemperature();
  const float h = dht.readHumidity();
  // 읽기 실패(NaN)와 물리적으로 불가능한 값을 모두 오류로 취급
  bool ok = !isnan(t) && !isnan(h) && t > -40.0f && t < 80.0f && h >= 0.0f && h <= 100.0f;
  mat = NAN;
#if MAT_SENSOR_ENABLED
  matSensor.requestTemperatures();
  const float m = matSensor.getTempCByIndex(0);
  if (m == DEVICE_DISCONNECTED_C || m < -40.0f || m > 125.0f) {
    ok = false;  // 패드 센서 고장은 과열을 감지할 수 없다는 뜻이므로 오류로 처리
  } else {
    mat = m;
  }
#endif
  if (ok) {
    temp = t;
    hum = h;
  }
  return ok;
}

// ---------------------------------------------------------------- 서버 전송 (별도 태스크)

static void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

static void sendReading(const Snapshot &s) {
  char body[256];
  char matJson[16];
  if (isnan(s.mat)) {
    strcpy(matJson, "null");
  } else {
    snprintf(matJson, sizeof(matJson), "%.1f", s.mat);
  }
  snprintf(body, sizeof(body),
           "{\"device_id\":\"%s\",\"temp\":%.1f,\"hum\":%d,\"level\":\"%s\",\"heater\":%s,\"state\":\"%s\",\"mat_temp\":%s}",
           DEVICE_ID, s.temp, s.hum, ig::levelName(s.level), s.heater ? "true" : "false", ig::stateName(s.state), matJson);

  const String url = String(SERVER_URL) + "/api/readings";
  HTTPClient http;
  WiFiClient plain;
  WiFiClientSecure secure;
  bool started;
  if (url.startsWith("https://")) {
    // 학습/시연용: 서버 인증서를 검증하지 않는다. (암호화는 되지만 중간자 공격은 막지 못함)
    // 실제 제품이라면 secure.setCACert(루트 인증서) 로 바꿔야 한다.
    secure.setInsecure();
    started = http.begin(secure, url);
  } else {
    started = http.begin(plain, url);
  }
  if (!started) {
    Serial.println("[net] http.begin 실패 (SERVER_URL 확인)");
    return;
  }
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  const int code = http.POST(body);
  if (code == 201) {
    Serial.printf("[net] 전송 OK (%d)\n", code);
    ig::Mode mode;
    uint32_t remainingSec;
    if (ig::parseCommand(http.getString().c_str(), mode, remainingSec)) {
      xSemaphoreTake(g_mutex, portMAX_DELAY);
      g_cmd.mode = mode;
      g_cmd.untilMs = millis() + remainingSec * 1000UL;
      xSemaphoreGive(g_mutex);
    }
  } else if (code == 401 || code == 404) {
    Serial.printf("[net] %d: API_KEY 또는 DEVICE_ID(서버에 등록된 장치) 를 확인하세요\n", code);
  } else if (code > 0) {
    Serial.printf("[net] 서버 응답 %d\n", code);
  } else {
    Serial.printf("[net] 전송 실패: %s\n", HTTPClient::errorToString(code).c_str());
  }
  http.end();
}

static void uploaderTask(void *) {
  uint32_t lastSend = 0;
  uint32_t lastWifiTry = millis();
  for (;;) {
    const uint32_t now = millis();
    if (WiFi.status() != WL_CONNECTED) {
      if (now - lastWifiTry >= 10000) {  // 10초마다 재접속 시도
        lastWifiTry = now;
        Serial.println("[net] Wi-Fi 재접속 시도");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      }
    } else if (now - lastSend >= SEND_INTERVAL_MS) {
      lastSend = now;
      Snapshot copy;
      xSemaphoreTake(g_mutex, portMAX_DELAY);
      copy = g_snap;
      xSemaphoreGive(g_mutex);
      if (copy.valid) sendReading(copy);
    }
    vTaskDelay(pdMS_TO_TICKS(200));
  }
}

// ---------------------------------------------------------------- 제어 루프

void setup() {
  // 부팅 직후 가장 먼저 열선을 끈다 (핀이 떠 있는 동안 켜지는 것을 방지)
  pinMode(PIN_HEATER, OUTPUT);
  setHeater(false);

  Serial.begin(115200);
  Serial.println();
  Serial.printf("IceGuard 시작 (장치 %s, %s 모드)\n", DEVICE_ID, DEMO_MODE ? "시연" : "실사용");

  dht.begin();
#if MAT_SENSOR_ENABLED
  matSensor.begin();
  matSensor.setResolution(10);
#endif

  g_mutex = xSemaphoreCreateMutex();
  connectWifi();
  xTaskCreatePinnedToCore(uploaderTask, "uploader", 10240, nullptr, 1, nullptr, 0);
}

void loop() {
  static uint32_t lastSensor = 0;
  static float lastTemp = NAN, lastHum = NAN;
  static ig::State lastState = ig::State::OFF;
  static ig::Mode lastMode = ig::Mode::AUTO;

  const uint32_t now = millis();
  if (now - lastSensor < SENSOR_INTERVAL_MS) {
    delay(10);
    return;
  }
  lastSensor = now;

  float t, h, mat;
  const bool ok = readSensors(t, h, mat);
  if (ok) {
    lastTemp = t;
    lastHum = h;
  }

  // 읽기에 실패하면 마지막 정상값으로 판단한다 (3회 연속 실패 시 상태머신이 FAULT 로 전환)
  PendingCommand cmd;
  xSemaphoreTake(g_mutex, portMAX_DELAY);
  cmd = g_cmd;
  xSemaphoreGive(g_mutex);
  machine.setMode(cmd.mode, cmd.untilMs);
  machine.update(now, lastTemp, lastHum, ok, mat);
  if (machine.mode() == ig::Mode::AUTO && cmd.mode != ig::Mode::AUTO) {
    // 만료된 명령을 지운다. (millis() 가 한 바퀴 돌아 옛 명령이 다시 살아나는 것도 막는다)
    xSemaphoreTake(g_mutex, portMAX_DELAY);
    if (g_cmd.mode == cmd.mode && g_cmd.untilMs == cmd.untilMs) g_cmd = PendingCommand();
    xSemaphoreGive(g_mutex);
  }
  if (machine.mode() != lastMode) {
    Serial.printf("[mode] %s -> %s\n", ig::modeName(lastMode), ig::modeName(machine.mode()));
    lastMode = machine.mode();
  }
  setHeater(machine.heaterOn());

  if (!isnan(lastTemp)) {
    xSemaphoreTake(g_mutex, portMAX_DELAY);
    g_snap.valid = true;
    g_snap.temp = lastTemp;
    g_snap.hum = (int)lroundf(lastHum);
    g_snap.level = ig::levelOf(lastTemp, lastHum);
    g_snap.heater = machine.heaterOn();
    g_snap.state = machine.state();
    g_snap.mat = mat;
    xSemaphoreGive(g_mutex);
  }

  if (machine.state() != lastState) {
    Serial.printf("[state] %s -> %s\n", ig::stateName(lastState), ig::stateName(machine.state()));
    lastState = machine.state();
  }
  Serial.printf("[sense] %s T=%.1f H=%.0f level=%s state=%s heater=%s mode=%s\n", ok ? "ok  " : "FAIL", lastTemp, lastHum,
                isnan(lastTemp) ? "-" : ig::levelName(ig::levelOf(lastTemp, lastHum)), ig::stateName(machine.state()),
                machine.heaterOn() ? "ON" : "off", ig::modeName(machine.mode()));
}
