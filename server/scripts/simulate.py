#!/usr/bin/env python3
"""ESP32 없이 서버와 화면을 확인하기 위한 시뮬레이터.

열선 상태머신은 docs/state-machine.md 의 규칙을 그대로 구현했다. (펌웨어 구현의 기준 역할)
표준 라이브러리만 사용하므로 별도 설치가 필요 없다.

사용 예:
    python scripts/simulate.py --api-key change-me                  # 결빙 시나리오 (시연 시간 기준)
    python scripts/simulate.py --api-key change-me --scenario fault # 센서 오류 포함
    python scripts/simulate.py --url https://xxx.onrender.com --api-key ... --duration 120
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

PROFILES = {
    "demo": {"max_run": 30, "cooldown": 10},    # 시연용: 연속 작동 30초, 휴식 10초
    "real": {"max_run": 600, "cooldown": 120},  # 실사용: 연속 작동 10분, 휴식 2분
}
MAT_LIMIT = 60.0  # 패드 온도 안전 한계 (℃)


def level_of(temp: float, hum: float) -> str:
    if temp <= 2 and hum >= 70:
        return "위험"
    if temp <= 5 and hum >= 70:
        return "주의"
    return "안전"


class HeaterMachine:
    """OFF → HEATING → (COOLDOWN) → OFF, 어디서든 FAULT."""

    def __init__(self, profile: dict):
        self.profile = profile
        self.state = "OFF"
        self.since = 0.0
        self.fails = 0

    def _go(self, state: str, now: float) -> None:
        self.state, self.since = state, now

    def update(self, now: float, temp: float, hum: float, sensor_ok: bool, mat_temp: float | None) -> None:
        self.fails = 0 if sensor_ok else self.fails + 1
        overheated = mat_temp is not None and mat_temp >= MAT_LIMIT
        if self.fails >= 3 or overheated:
            if self.state != "FAULT":
                self._go("FAULT", now)
            return
        if self.state == "FAULT":
            if sensor_ok:
                self._go("OFF", now)
            return
        if self.state == "OFF":
            if temp <= 2 and hum >= 70:
                self._go("HEATING", now)
        elif self.state == "HEATING":
            if temp >= 5:
                self._go("OFF", now)
            elif now - self.since >= self.profile["max_run"]:
                self._go("COOLDOWN", now)
        elif self.state == "COOLDOWN":
            if now - self.since >= self.profile["cooldown"]:
                self._go("OFF", now)

    @property
    def heater_on(self) -> bool:
        return self.state == "HEATING"


def ambient(scenario: str, t: float) -> tuple[float, float]:
    """시나리오별 주변 온도와 습도."""
    if scenario == "normal":
        return 10.0, 50.0
    return (8.0, 55.0) if t < 10 else (0.0, 88.0)  # 10초 뒤 갑자기 추워지고 습해짐


def post(url: str, api_key: str, body: dict) -> tuple[int, dict]:
    request = urllib.request.Request(
        url.rstrip("/") + "/api/readings",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode("utf-8") or "{}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--api-key", default=os.environ.get("API_KEY", ""))
    parser.add_argument("--device-id", default="iceguard-01")
    parser.add_argument("--scenario", choices=["ice", "fault", "normal"], default="ice")
    parser.add_argument("--profile", choices=list(PROFILES), default="demo")
    parser.add_argument("--interval", type=float, default=1.0, help="전송 간격(초). 실제 장치는 10")
    parser.add_argument("--duration", type=float, default=0, help="실행 시간(초). 0이면 Ctrl+C 까지")
    parser.add_argument("--no-mat", action="store_true", help="패드 온도 센서가 없는 것처럼 mat_temp=null 전송")
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()
    if not args.api_key:
        parser.error("--api-key 가 필요합니다 (또는 API_KEY 환경변수)")

    rng = random.Random(args.seed)
    machine = HeaterMachine(PROFILES[args.profile])
    start = time.monotonic()
    temp, hum = 8.0, 55.0
    sent = 0

    try:
        while args.duration <= 0 or time.monotonic() - start < args.duration:
            now = time.monotonic() - start
            amb_temp, amb_hum = ambient(args.scenario, now)

            # 열선이 켜져 있으면 온도가 올라가고, 꺼져 있으면 주변 온도로 수렴
            temp += (amb_temp - temp) * 0.15 + (0.9 if machine.heater_on else 0.0) + rng.uniform(-0.1, 0.1)
            hum += (amb_hum - hum) * 0.2 + rng.uniform(-0.5, 0.5)
            hum = max(0.0, min(100.0, hum))

            sensor_ok = not (args.scenario == "fault" and 20 <= now < 26)  # 20~26초 센서 오류
            mat_temp = None if args.no_mat else round(temp + (35.0 if machine.heater_on else 0.3), 1)

            machine.update(now, temp, hum, sensor_ok, mat_temp)
            body = {
                "device_id": args.device_id,
                "temp": round(temp, 1),
                "hum": round(hum),
                "level": level_of(temp, hum),
                "heater": machine.heater_on,
                "state": machine.state,
                "mat_temp": mat_temp,
            }
            try:
                status, reply = post(args.url, args.api_key, body)
            except (urllib.error.URLError, TimeoutError) as error:
                print(f"[{now:5.0f}s] 전송 실패 (장치는 계속 동작): {error}")
            else:
                note = reply.get("data", {}).get("events") or reply.get("message", "")
                print(f"[{now:5.0f}s] {body['temp']:5.1f}℃ {body['hum']:3d}% {body['level']} "
                      f"{body['state']:<8} → HTTP {status} {note if note else ''}")
                sent += 1
                if status in (401, 404):
                    print("인증 또는 장치 등록 문제입니다. 중단합니다.")
                    return 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    print(f"종료: {sent}건 전송")
    return 0


if __name__ == "__main__":
    sys.exit(main())
