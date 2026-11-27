// 결빙 단계 판정 + 열선 상태머신. Arduino 의존성이 없어서 PC 에서도 컴파일/테스트할 수 있다.
// 규칙의 기준: docs/state-machine.md (server/scripts/simulate.py 와 동일하게 동작해야 함)
#pragma once
#include <math.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

namespace ig {

enum class State : uint8_t { OFF, HEATING, COOLDOWN, FAULT };
enum class Level : uint8_t { SAFE, CAUTION, DANGER };
// 관리자 수동 모드. AUTO 가 아니면 시간 제한이 있고, 끝나면 AUTO 로 돌아간다.
enum class Mode : uint8_t { AUTO, FORCE_ON, FORCE_OFF };

constexpr float MAT_LIMIT_C = 60.0f;  // 패드 온도 안전 한계

inline Level levelOf(float temp, float hum) {
  if (temp <= 2.0f && hum >= 70.0f) return Level::DANGER;
  if (temp <= 5.0f && hum >= 70.0f) return Level::CAUTION;
  return Level::SAFE;
}

// 서버가 기대하는 문자열 (API 명세)
inline const char* stateName(State s) {
  switch (s) {
    case State::OFF: return "OFF";
    case State::HEATING: return "HEATING";
    case State::COOLDOWN: return "COOLDOWN";
    default: return "FAULT";
  }
}
inline const char* levelName(Level l) {
  switch (l) {
    case Level::SAFE: return "안전";
    case Level::CAUTION: return "주의";
    default: return "위험";
  }
}

// 서버 응답(POST /api/readings)에서 command 를 읽는다. 예:
//   {"ok":true,"data":{"ts":1,"events":[],"command":{"mode":"FORCE_ON","remaining_sec":42}}}
// 못 읽으면 false (이때는 현재 모드를 그대로 둔다. 모드는 시간이 지나면 어차피 끝난다)
inline bool parseCommand(const char* body, Mode& mode, uint32_t& remainingSec) {
  const char* cmd = strstr(body, "\"command\"");
  if (!cmd) return false;
  const char* m = strstr(cmd, "\"mode\"");
  const char* r = strstr(cmd, "\"remaining_sec\"");
  if (!m || !r) return false;
  m = strchr(m + 6, ':');
  r = strchr(r + 15, ':');
  if (!m || !r) return false;
  m++;
  while (*m == ' ' || *m == '"') m++;
  r++;
  while (*r == ' ') r++;
  if (strncmp(m, "FORCE_ON", 8) == 0) mode = Mode::FORCE_ON;
  else if (strncmp(m, "FORCE_OFF", 9) == 0) mode = Mode::FORCE_OFF;
  else if (strncmp(m, "AUTO", 4) == 0) mode = Mode::AUTO;
  else return false;
  const long v = strtol(r, nullptr, 10);
  remainingSec = v < 0 ? 0 : (uint32_t)v;
  return true;
}

inline const char* modeName(Mode m) {
  switch (m) {
    case Mode::FORCE_ON: return "FORCE_ON";
    case Mode::FORCE_OFF: return "FORCE_OFF";
    default: return "AUTO";
  }
}

class HeaterMachine {
 public:
  HeaterMachine(uint32_t maxRunMs, uint32_t cooldownMs) : maxRunMs_(maxRunMs), cooldownMs_(cooldownMs) {}

  // 수동 모드 설정. untilMs 가 지나면 자동으로 AUTO. 안전 규칙(FAULT, 연속 작동 한도)은 항상 우선한다.
  void setMode(Mode mode, uint32_t untilMs) {
    mode_ = mode;
    modeUntil_ = untilMs;
  }
  Mode mode() const { return mode_; }

  // nowMs: millis() 같은 단조 증가 시각. 부호 없는 뺄셈이라 49일 뒤 오버플로에도 안전하다.
  // sensorOk 가 false 여도 temp/hum 에는 마지막 정상값을 넘긴다. (simulate.py 와 같은 동작)
  // matTemp: 패드 온도 센서가 없으면 NAN
  void update(uint32_t nowMs, float temp, float hum, bool sensorOk, float matTemp) {
    if (mode_ != Mode::AUTO && (int32_t)(nowMs - modeUntil_) >= 0) mode_ = Mode::AUTO;  // 시간 만료
    const bool forcedOn = mode_ == Mode::FORCE_ON, forcedOff = mode_ == Mode::FORCE_OFF;
    fails_ = sensorOk ? 0 : (fails_ < 255 ? fails_ + 1 : 255);
    const bool overheated = !isnan(matTemp) && matTemp >= MAT_LIMIT_C;
    if (fails_ >= 3 || overheated) {
      if (state_ != State::FAULT) go(State::FAULT, nowMs);
      return;
    }
    switch (state_) {
      case State::FAULT:
        if (sensorOk) go(State::OFF, nowMs);
        break;
      case State::OFF:
        if (forcedOn || (!forcedOff && temp <= 2.0f && hum >= 70.0f)) go(State::HEATING, nowMs);
        break;
      case State::HEATING:
        if (forcedOff || (!forcedOn && temp >= 5.0f)) go(State::OFF, nowMs);
        else if (nowMs - since_ >= maxRunMs_) go(State::COOLDOWN, nowMs);
        break;
      case State::COOLDOWN:
        if (nowMs - since_ >= cooldownMs_) go(State::OFF, nowMs);
        break;
    }
  }

  State state() const { return state_; }
  bool heaterOn() const { return state_ == State::HEATING; }

 private:
  void go(State s, uint32_t nowMs) { state_ = s; since_ = nowMs; }

  uint32_t maxRunMs_, cooldownMs_;
  State state_ = State::OFF;
  Mode mode_ = Mode::AUTO;
  uint32_t modeUntil_ = 0;
  uint32_t since_ = 0;
  uint8_t fails_ = 0;
};

}  // namespace ig
