// 서버 응답에서 수동 명령을 읽는 parseCommand 단위 테스트.
// 빌드: g++ -std=c++17 -I../iceguard check_parse.cpp -o check_parse
#include <cstdio>

#include "iceguard_logic.h"

static int failures = 0;

static void expectOk(const char* body, ig::Mode mode, uint32_t sec) {
  ig::Mode m = ig::Mode::AUTO;
  uint32_t s = 999;
  const bool ok = ig::parseCommand(body, m, s);
  if (!ok || m != mode || s != sec) {
    std::printf("실패: %s → ok=%d mode=%s sec=%u (기대 %s %u)\n", body, ok, ig::modeName(m), s, ig::modeName(mode), sec);
    ++failures;
  }
}

static void expectFail(const char* body) {
  ig::Mode m = ig::Mode::FORCE_ON;
  uint32_t s = 777;
  const bool ok = ig::parseCommand(body, m, s);
  if (ok || m != ig::Mode::FORCE_ON || s != 777) {  // 실패하면 값을 건드리지 않아야 한다
    std::printf("실패: 파싱되면 안 됨 또는 값이 바뀜: %s\n", body);
    ++failures;
  }
}

int main() {
  expectOk("{\"ok\":true,\"data\":{\"ts\":1795741770332,\"events\":[],\"command\":{\"mode\":\"FORCE_ON\",\"remaining_sec\":42}}}",
           ig::Mode::FORCE_ON, 42);
  expectOk("{\"ok\":true,\"data\":{\"events\":[\"HEATER_ON\"],\"command\":{\"mode\":\"FORCE_OFF\",\"remaining_sec\":600}}}",
           ig::Mode::FORCE_OFF, 600);
  expectOk("{\"ok\":true,\"data\":{\"command\":{\"mode\":\"AUTO\",\"remaining_sec\":0}}}", ig::Mode::AUTO, 0);
  expectOk("{\"data\": {\"command\": {\"mode\": \"FORCE_ON\", \"remaining_sec\": 7}}}", ig::Mode::FORCE_ON, 7);  // 공백 허용
  expectOk("{\"data\":{\"command\":{\"remaining_sec\":15,\"mode\":\"FORCE_OFF\"}}}", ig::Mode::FORCE_OFF, 15);    // 순서 무관
  expectOk("{\"data\":{\"command\":{\"mode\":\"FORCE_ON\",\"remaining_sec\":-5}}}", ig::Mode::FORCE_ON, 0);       // 음수는 0

  expectFail("");
  expectFail("{\"ok\":true,\"data\":{\"ts\":1,\"events\":[]}}");  // 옛 서버: command 없음
  expectFail("{\"data\":{\"command\":{\"mode\":\"BURN\",\"remaining_sec\":5}}}");
  expectFail("{\"data\":{\"command\":{\"mode\":\"FORCE_ON\"}}}");
  expectFail("{\"ok\":false,\"error\":\"UNAUTHORIZED\",\"message\":\"x\"}");
  expectFail("<html>502 Bad Gateway</html>");

  if (failures) return 1;
  std::printf("parseCommand: 모두 통과\n");
  return 0;
}
