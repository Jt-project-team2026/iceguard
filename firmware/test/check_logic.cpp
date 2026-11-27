// gen_cases.py 가 만든 CSV 를 읽어 firmware/iceguard/iceguard_logic.h 의 결과와 비교한다.
// 빌드: g++ -std=c++17 -I../iceguard check_logic.cpp -o check_logic
// 실행: python3 gen_cases.py demo 1 | ./check_logic demo
#include <cstdio>
#include <cstring>
#include <iostream>
#include <string>

#include "iceguard_logic.h"

static const char *levelEn(ig::Level l) {
  switch (l) {
    case ig::Level::SAFE: return "SAFE";
    case ig::Level::CAUTION: return "CAUTION";
    default: return "DANGER";
  }
}

int main(int argc, char **argv) {
  const bool demo = argc < 2 || std::strcmp(argv[1], "real") != 0;
  ig::HeaterMachine machine(demo ? 30000 : 600000, demo ? 10000 : 120000);
  std::string line;
  long total = 0, bad = 0, heating = 0, cooldown = 0, fault = 0;
  while (std::getline(std::cin, line)) {
    long sec;
    float temp, hum, mat;
    int ok;
    char st[32], lv[32], md[32];
    long until;
    if (std::sscanf(line.c_str(), "%ld,%f,%f,%d,%f,%31[^,],%31[^,],%31[^,],%ld", &sec, &temp, &hum, &ok, &mat, st, lv, md, &until) != 9) {
      std::fprintf(stderr, "형식 오류: %s\n", line.c_str());
      return 2;
    }
    machine.setMode(!std::strcmp(md, "FORCE_ON") ? ig::Mode::FORCE_ON : !std::strcmp(md, "FORCE_OFF") ? ig::Mode::FORCE_OFF : ig::Mode::AUTO,
                    (uint32_t)(until * 1000));
    machine.update((uint32_t)(sec * 1000), temp, hum, ok != 0, mat);
    const char *gotState = ig::stateName(machine.state());
    const char *gotLevel = levelEn(ig::levelOf(temp, hum));
    ++total;
    if (!std::strcmp(gotState, "HEATING")) ++heating;
    if (!std::strcmp(gotState, "COOLDOWN")) ++cooldown;
    if (!std::strcmp(gotState, "FAULT")) ++fault;
    if (std::strcmp(gotState, st) || std::strcmp(gotLevel, lv)) {
      if (++bad <= 5) std::printf("불일치 #%ld: %s\n  기대 %s/%s, 실제 %s/%s\n", sec, line.c_str(), st, lv, gotState, gotLevel);
    }
  }
  std::printf("%s: %ld건 비교, 불일치 %ld건 (HEATING %ld, COOLDOWN %ld, FAULT %ld 구간 포함)\n", demo ? "demo" : "real", total, bad,
              heating, cooldown, fault);
  return bad ? 1 : 0;
}
