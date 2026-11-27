#!/usr/bin/env python3
"""펌웨어 상태머신 검증용 입력/기대값 생성기.

server/scripts/simulate.py 의 HeaterMachine(기준 구현)에 무작위 입력을 넣어
"시각(초),온도,습도,센서정상,패드온도,기대상태,기대단계,수동모드,모드종료시각(초)" 를 CSV 로 출력한다.
check_logic.cpp 가 같은 입력을 펌웨어 로직에 넣어 결과를 비교한다.

사용: python gen_cases.py <demo|real> [seed] [steps]
"""
import importlib.util
import pathlib
import random
import sys

SIM = pathlib.Path(__file__).resolve().parents[2] / "server" / "scripts" / "simulate.py"
spec = importlib.util.spec_from_file_location("simulate", SIM)
sim = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sim)

LEVEL = {"안전": "SAFE", "주의": "CAUTION", "위험": "DANGER"}


def main() -> None:
    profile = sys.argv[1] if len(sys.argv) > 1 else "demo"
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    steps = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
    rng = random.Random(seed)
    machine = sim.HeaterMachine(sim.PROFILES[profile])

    # 경계값(2, 5, 70, 60)을 자주 지나가도록 0.5 단위(float 로 정확히 표현됨)의 값을 쓴다.
    temps = [x / 2 for x in range(-6, 31)]
    hums = [x / 2 for x in range(100, 201, 1)] + [69.5, 70.0, 70.5]
    temp, hum, mat_mode = 8.0, 55.0, "none"
    hold = 0
    bad_run = 0
    mode, until = "AUTO", 0
    for now in range(steps):
        if hold <= 0:  # 같은 환경을 한동안 유지해야 쿨다운/최대작동 같은 시간 규칙이 검증된다
            temp, hum = rng.choice(temps), rng.choice(hums)
            mat_mode = rng.choice(["none"] * 4 + ["normal"] * 5 + ["hot"])
            hold = rng.randint(1, 120 if profile == "demo" else 1500)
        hold -= 1
        if bad_run > 0:
            bad_run -= 1
            ok = False
        elif rng.random() < (0.02 if profile == "demo" else 0.001):
            bad_run = rng.randint(0, 5)
            ok = False
        else:
            ok = True
        if rng.random() < 0.01:  # 관리자가 수동 모드를 바꾼다 (펌웨어는 응답마다 같은 값을 다시 받는다)
            mode = rng.choice(["AUTO", "FORCE_ON", "FORCE_OFF", "FORCE_ON"])
            until = 0 if mode == "AUTO" else now + rng.randint(5, 90 if profile == "demo" else 900)
        mat = {"none": None, "normal": rng.choice([20.0, 35.5, 59.5]), "hot": rng.choice([59.5, 60.0, 61.5])}[mat_mode]

        machine.set_mode(mode, float(until))
        machine.update(float(now), temp, hum, ok, mat)
        mat_s = "nan" if mat is None else f"{mat}"
        print(f"{now},{temp},{hum},{int(ok)},{mat_s},{machine.state},{LEVEL[sim.level_of(temp, hum)]},{mode},{until}")


if __name__ == "__main__":
    main()
