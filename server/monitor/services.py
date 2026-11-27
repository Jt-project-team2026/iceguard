"""측정값 저장, 이벤트 생성, 응답 변환 로직."""
import time

from django.conf import settings
from django.db import transaction

from .models import Device, Event, EventType, HeaterMode, HeaterState, Reading


def now_ms() -> int:
    return int(time.time() * 1000)


def derive_events(prev_state: str, reading: Reading) -> list[tuple[str, str]]:
    """이전 상태와 새 측정값을 비교해 이벤트 (type, detail) 목록을 만든다."""
    new_state = reading.state
    if new_state == prev_state:
        return []

    if new_state == HeaterState.FAULT:
        return [(EventType.FAULT, "센서 오류 또는 패드 과열 감지")]

    events: list[tuple[str, str]] = []
    if prev_state == HeaterState.FAULT:
        events.append((EventType.RECOVERED, "정상 수신 재개"))

    if new_state == HeaterState.HEATING:
        if reading.level == "위험":
            events.append((EventType.HEATER_ON, f"{reading.temp:.1f}℃ · 습도 {reading.hum:.0f}%"))
        else:
            events.append((EventType.HEATER_ON, "수동 제어로 작동"))
    elif new_state == HeaterState.COOLDOWN:
        events.append((EventType.COOLDOWN, "연속 작동 한도 도달, 휴식"))
    elif new_state == HeaterState.OFF and prev_state == HeaterState.HEATING:
        if reading.temp >= 5:
            events.append((EventType.HEATER_OFF, f"{reading.temp:.1f}℃ 도달"))
        else:
            events.append((EventType.HEATER_OFF, "수동 제어로 정지"))
    return events


@transaction.atomic
def record_reading(device: Device, data: dict) -> tuple[Reading, list[Event]]:
    previous = device.readings.order_by("-ts", "-id").first()
    prev_state = previous.state if previous else HeaterState.OFF

    reading = Reading.objects.create(
        device=device,
        ts=now_ms(),
        temp=data["temp"],
        hum=data["hum"],
        level=data["level"],
        heater=data["heater"],
        state=data["state"],
        mat_temp=data.get("mat_temp"),
    )
    events = [
        Event(device=device, ts=reading.ts, type=etype, detail=detail)
        for etype, detail in derive_events(prev_state, reading)
    ]
    Event.objects.bulk_create(events)
    return reading, events


def effective_mode(device: Device, now: int | None = None) -> tuple[str, int]:
    """(현재 유효한 모드, 남은 초). 만료됐으면 (AUTO, 0). DB 는 바꾸지 않는다."""
    now = now_ms() if now is None else now
    if device.mode != HeaterMode.AUTO and device.mode_until is not None and device.mode_until > now:
        return device.mode, max(1, -(-(device.mode_until - now) // 1000))  # 올림
    return HeaterMode.AUTO, 0


def command_for_device(device: Device) -> dict:
    """ESP32 에 돌려줄 명령. 만료된 수동 모드는 여기서 AUTO 로 되돌리고 이벤트를 남긴다."""
    now = now_ms()
    mode, remaining = effective_mode(device, now)
    if device.mode != HeaterMode.AUTO and mode == HeaterMode.AUTO:
        label = HeaterMode(device.mode).label
        device.mode, device.mode_until = HeaterMode.AUTO, None
        device.save(update_fields=["mode", "mode_until"])
        Event.objects.create(device=device, ts=now, type=EventType.MODE_CHANGED, detail=f"{label} 시간 만료, 자동으로 복귀")
    return {"mode": mode, "remaining_sec": remaining}


@transaction.atomic
def set_command(device: Device, mode: str, duration_sec: int) -> dict:
    now = now_ms()
    previous, _ = effective_mode(device, now)
    if mode == HeaterMode.AUTO:
        device.mode, device.mode_until = HeaterMode.AUTO, None
    else:
        device.mode, device.mode_until = mode, now + duration_sec * 1000
    device.save(update_fields=["mode", "mode_until"])

    detail = f"{HeaterMode(previous).label} → {HeaterMode(mode).label}"
    if mode != HeaterMode.AUTO:
        detail += f" ({duration_sec}초)"
    Event.objects.create(device=device, ts=now, type=EventType.MODE_CHANGED, detail=detail)
    return {"device_id": device.device_id, **command_for_device(device)}


def latest_reading(device: Device) -> Reading | None:
    return device.readings.order_by("-ts", "-id").first()


def reading_to_dict(reading: Reading, *, with_age: bool = False) -> dict:
    body = {
        "ts": reading.ts,
        "temp": reading.temp,
        "hum": reading.hum,
        "level": reading.level,
        "heater": reading.heater,
        "state": reading.state,
        "mat_temp": reading.mat_temp,
    }
    if with_age:
        body["age_sec"] = max(0, (now_ms() - reading.ts) // 1000)
    return body


def device_to_dict(device: Device) -> dict:
    latest = latest_reading(device)
    latest_body = reading_to_dict(latest, with_age=True) if latest else None
    online = latest_body is not None and latest_body["age_sec"] <= settings.OFFLINE_SEC
    mode, remaining = effective_mode(device)
    return {
        "device_id": device.device_id,
        "name": device.name,
        "lat": device.lat,
        "lng": device.lng,
        "latest": latest_body,
        "online": online,
        "mode": mode,
        "mode_remaining_sec": remaining,
    }


def event_to_dict(event: Event) -> dict:
    return {
        "id": event.id,
        "ts": event.ts,
        "device_id": event.device.device_id,
        "device_name": event.device.name,
        "type": event.type,
        "detail": event.detail,
    }


def downsample(rows: list, max_points: int) -> list:
    """첫 점과 마지막 점을 유지하면서 max_points 개 이하로 고르게 줄인다."""
    count = len(rows)
    if count <= max_points:
        return rows
    indexes = {round(i * (count - 1) / (max_points - 1)) for i in range(max_points)}
    return [rows[i] for i in sorted(indexes)]
