// 결빙 단계 판정 + 열선 상태머신. Arduino 의존성이 없어서 PC 에서도 컴파일/테스트할 수 있다.
// 규칙의 기준: docs/state-machine.md (server/scripts/simulate.py 와 동일하게 동작해야 함)
#pragma once
#include <math.h>
#include <stdint.h>

namespace ig {

enum class State : uint8_t { OFF, HEATING, COOLDOWN, FAULT };
enum class Level : uint8_t { SAFE, CAUTION, DANGER };

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

class HeaterMachine {
 public:
  HeaterMachine(uint32_t maxRunMs, uint32_t cooldownMs) : maxRunMs_(maxRunMs), cooldownMs_(cooldownMs) {}

  // nowMs: millis() 같은 단조 증가 시각. 부호 없는 뺄셈이라 49일 뒤 오버플로에도 안전하다.
  // sensorOk 가 false 여도 temp/hum 에는 마지막 정상값을 넘긴다. (simulate.py 와 같은 동작)
  // matTemp: 패드 온도 센서가 없으면 NAN
  void update(uint32_t nowMs, float temp, float hum, bool sensorOk, float matTemp) {
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
        if (temp <= 2.0f && hum >= 70.0f) go(State::HEATING, nowMs);
        break;
      case State::HEATING:
        if (temp >= 5.0f) go(State::OFF, nowMs);
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
  uint32_t since_ = 0;
  uint8_t fails_ = 0;
};

}  // namespace ig
