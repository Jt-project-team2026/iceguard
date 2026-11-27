// 수동 모드에서도 안전 규칙이 우선하는지 직접 확인하는 시나리오 테스트 (기준 구현과 비교하지 않는 독립 검증).
// 빌드: g++ -std=c++17 -I../iceguard check_safety.cpp -o check_safety
#include <cstdio>

#include "iceguard_logic.h"

using ig::Mode;
using ig::State;

static int failures = 0;
#define CHECK(cond)                                              \
  do {                                                           \
    if (!(cond)) {                                               \
      std::printf("실패 (줄 %d): %s\n", __LINE__, #cond);        \
      ++failures;                                                \
    }                                                            \
  } while (0)

static const float NOMAT = NAN;
constexpr uint32_t S = 1000;

int main() {
  // 1) 강제 켜기: 따뜻하고 건조해도 켜진다
  {
    ig::HeaterMachine m(30 * S, 10 * S);
    m.setMode(Mode::FORCE_ON, 60 * S);
    m.update(0, 10, 40, true, NOMAT);
    CHECK(m.state() == State::HEATING && m.heaterOn());
    m.update(2 * S, 10, 40, true, NOMAT);  // 5℃ 이상이어도 강제 중에는 안 꺼진다
    CHECK(m.state() == State::HEATING);
  }
  // 2) 강제 켜기여도 패드 60℃ 이상이면 FAULT 로 꺼진다
  {
    ig::HeaterMachine m(30 * S, 10 * S);
    m.setMode(Mode::FORCE_ON, 60 * S);
    m.update(0, 10, 40, true, 30.0f);
    m.update(2 * S, 10, 40, true, 60.0f);
    CHECK(m.state() == State::FAULT && !m.heaterOn());
    m.update(4 * S, 10, 40, true, 30.0f);  // 센서 정상이면 OFF 로 복구
    CHECK(m.state() == State::OFF);
    m.update(6 * S, 10, 40, true, 30.0f);  // 아직 강제 모드라면 다시 켜진다 (60초 한도 안)
    CHECK(m.state() == State::HEATING);
  }
  // 3) 강제 켜기여도 센서가 3번 연속 실패하면 FAULT
  {
    ig::HeaterMachine m(30 * S, 10 * S);
    m.setMode(Mode::FORCE_ON, 60 * S);
    m.update(0, 10, 40, true, NOMAT);
    m.update(2 * S, 10, 40, false, NOMAT);
    m.update(4 * S, 10, 40, false, NOMAT);
    CHECK(m.state() == State::HEATING);
    m.update(6 * S, 10, 40, false, NOMAT);
    CHECK(m.state() == State::FAULT && !m.heaterOn());
  }
  // 4) 강제 켜기여도 연속 작동 한도(30초)를 넘으면 쿨다운
  {
    ig::HeaterMachine m(30 * S, 10 * S);
    m.setMode(Mode::FORCE_ON, 600 * S);
    m.update(0, 10, 40, true, NOMAT);
    m.update(29 * S, 10, 40, true, NOMAT);
    CHECK(m.state() == State::HEATING);
    m.update(30 * S, 10, 40, true, NOMAT);
    CHECK(m.state() == State::COOLDOWN && !m.heaterOn());
    m.update(39 * S, 10, 40, true, NOMAT);
    CHECK(m.state() == State::COOLDOWN);
  }
  // 5) 강제 끄기: 위험 조건이어도 안 켜지고, 켜져 있던 열선은 바로 꺼진다
  {
    ig::HeaterMachine m(30 * S, 10 * S);
    m.setMode(Mode::FORCE_OFF, 60 * S);
    m.update(0, 0, 90, true, NOMAT);
    CHECK(m.state() == State::OFF);
    ig::HeaterMachine n(30 * S, 10 * S);
    n.update(0, 0, 90, true, NOMAT);
    CHECK(n.state() == State::HEATING);
    n.setMode(Mode::FORCE_OFF, 60 * S);
    n.update(2 * S, 0, 90, true, NOMAT);
    CHECK(n.state() == State::OFF && !n.heaterOn());
  }
  // 6) 시간이 지나면 자동 모드로 돌아간다 (강제 켜기 → 따뜻하면 꺼짐, 강제 끄기 → 위험하면 켜짐)
  {
    ig::HeaterMachine m(600 * S, 120 * S);
    m.setMode(Mode::FORCE_ON, 10 * S);
    m.update(0, 10, 40, true, NOMAT);
    m.update(9 * S, 10, 40, true, NOMAT);
    CHECK(m.state() == State::HEATING && m.mode() == Mode::FORCE_ON);
    m.update(10 * S, 10, 40, true, NOMAT);
    CHECK(m.mode() == Mode::AUTO && m.state() == State::OFF);
    ig::HeaterMachine n(600 * S, 120 * S);
    n.setMode(Mode::FORCE_OFF, 10 * S);
    n.update(0, 0, 90, true, NOMAT);
    CHECK(n.state() == State::OFF);
    n.update(10 * S, 0, 90, true, NOMAT);
    CHECK(n.mode() == Mode::AUTO && n.state() == State::HEATING);
  }
  // 7) millis() 가 한 바퀴 돌아도(49일) 만료 판정이 맞다
  {
    ig::HeaterMachine m(600 * S, 120 * S);
    const uint32_t start = 0xFFFFFFFFu - 5 * S;  // 오버플로 5초 전
    m.setMode(Mode::FORCE_ON, start + 20 * S);   // 15초 뒤 0 을 지나 만료
    m.update(start, 10, 40, true, NOMAT);
    CHECK(m.state() == State::HEATING);
    m.update(start + 19 * S, 10, 40, true, NOMAT);
    CHECK(m.mode() == Mode::FORCE_ON);
    m.update(start + 20 * S, 10, 40, true, NOMAT);
    CHECK(m.mode() == Mode::AUTO && m.state() == State::OFF);
  }

  if (failures) return 1;
  std::printf("수동 모드 안전 규칙: 모두 통과\n");
  return 0;
}
