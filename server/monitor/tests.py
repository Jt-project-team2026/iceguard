from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from .models import Device, Event, Reading
from .services import derive_events, downsample, now_ms

KEY = {"HTTP_X_API_KEY": "test-key"}
ADMIN = {"HTTP_X_ADMIN_PASSWORD": "test-pass"}


def payload(**overrides):
    body = {
        "device_id": "iceguard-01",
        "temp": 8.4,
        "hum": 52,
        "level": "안전",
        "heater": False,
        "state": "OFF",
        "mat_temp": None,
    }
    body.update(overrides)
    return body


@override_settings(API_KEY="test-key", ADMIN_PASSWORD="test-pass", OFFLINE_SEC=25)
class ApiTestBase(TestCase):
    def setUp(self):
        cache.clear()  # 요청 횟수 제한 기록 초기화
        self.client = APIClient()
        self.device = Device.objects.create(device_id="iceguard-01", name="정문 오르막", lat=37.5, lng=127.0)

    def post_reading(self, **overrides):
        return self.client.post("/api/readings", payload(**overrides), format="json", **KEY)


class ReadingCreateTests(ApiTestBase):
    def test_requires_api_key(self):
        response = self.client.post("/api/readings", payload(), format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "UNAUTHORIZED")

    def test_wrong_api_key(self):
        response = self.client.post("/api/readings", payload(), format="json", HTTP_X_API_KEY="nope")
        self.assertEqual(response.status_code, 401)

    @override_settings(API_KEY="")
    def test_empty_server_api_key_rejects_everything(self):
        response = self.client.post("/api/readings", payload(), format="json", HTTP_X_API_KEY="")
        self.assertEqual(response.status_code, 401)

    def test_unknown_device_returns_404(self):
        response = self.post_reading(device_id="ghost")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"], "UNKNOWN_DEVICE")
        self.assertEqual(Reading.objects.count(), 0)

    def test_invalid_values_return_400(self):
        for bad in (
            {"temp": 200},
            {"hum": 150},
            {"level": "mid"},
            {"state": "BURNING"},
            {"heater": "maybe"},
            {"mat_temp": 999},
        ):
            with self.subTest(bad=bad):
                response = self.post_reading(**bad)
                self.assertEqual(response.status_code, 400)
                body = response.json()
                self.assertFalse(body["ok"])
                self.assertEqual(body["error"], "INVALID_INPUT")

    def test_missing_field_returns_400(self):
        body = payload()
        del body["temp"]
        response = self.client.post("/api/readings", body, format="json", **KEY)
        self.assertEqual(response.status_code, 400)

    def test_nan_is_rejected(self):
        response = self.client.post(
            "/api/readings",
            data='{"device_id":"iceguard-01","temp":NaN,"hum":50,"level":"안전","heater":false,"state":"OFF"}',
            content_type="application/json",
            **KEY,
        )
        self.assertEqual(response.status_code, 400)

    def test_valid_reading_is_stored(self):
        response = self.post_reading(temp=1.5, hum=86, level="위험", heater=True, state="HEATING", mat_temp=42.1)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["ok"])
        reading = Reading.objects.get()
        self.assertEqual((reading.temp, reading.hum, reading.state, reading.mat_temp), (1.5, 86, "HEATING", 42.1))
        self.assertAlmostEqual(reading.ts, now_ms(), delta=5000)

    def test_mat_temp_is_optional(self):
        body = payload()
        del body["mat_temp"]
        response = self.client.post("/api/readings", body, format="json", **KEY)
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Reading.objects.get().mat_temp)

    def test_malformed_json(self):
        response = self.client.post("/api/readings", data="{oops", content_type="application/json", **KEY)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "INVALID_JSON")


class EventGenerationTests(ApiTestBase):
    def event_types(self):
        return list(Event.objects.order_by("ts", "id").values_list("type", flat=True))

    def test_full_cycle_creates_expected_events(self):
        steps = [
            dict(state="OFF"),
            dict(state="OFF"),  # 같은 상태 반복 → 이벤트 없음
            dict(state="HEATING", heater=True, temp=1.9, hum=84, level="위험"),
            dict(state="HEATING", heater=True, temp=2.5, hum=84, level="위험"),
            dict(state="COOLDOWN", heater=False),
            dict(state="OFF"),
            dict(state="HEATING", heater=True, temp=1.0, hum=90, level="위험"),
            dict(state="OFF", temp=5.2),
            dict(state="FAULT"),
            dict(state="FAULT"),
            dict(state="OFF"),
        ]
        for step in steps:
            self.assertEqual(self.post_reading(**step).status_code, 201)
        self.assertEqual(
            self.event_types(),
            ["HEATER_ON", "COOLDOWN", "HEATER_ON", "HEATER_OFF", "FAULT", "RECOVERED"],
        )

    def test_first_reading_heating_creates_event(self):
        self.post_reading(state="HEATING", heater=True, temp=1.0, hum=90, level="위험")
        self.assertEqual(self.event_types(), ["HEATER_ON"])

    def test_first_reading_off_creates_no_event(self):
        self.post_reading(state="OFF")
        self.assertEqual(self.event_types(), [])

    def test_response_lists_created_events(self):
        self.post_reading(state="OFF")
        response = self.post_reading(state="FAULT")
        self.assertEqual(response.json()["data"]["events"], ["FAULT"])

    def test_recovered_directly_to_heating_creates_two_events(self):
        self.post_reading(state="FAULT")
        self.post_reading(state="HEATING", heater=True, temp=1.0, hum=90, level="위험")
        self.assertEqual(self.event_types(), ["FAULT", "RECOVERED", "HEATER_ON"])

    def test_events_are_per_device(self):
        Device.objects.create(device_id="iceguard-02", name="B")
        self.post_reading(state="HEATING", heater=True, temp=1.0, hum=90, level="위험")
        self.post_reading(device_id="iceguard-02", state="OFF")
        self.assertEqual(Event.objects.filter(device__device_id="iceguard-02").count(), 0)

    def test_derive_events_pure(self):
        reading = Reading(temp=5.2, hum=60, state="OFF")
        self.assertEqual(derive_events("HEATING", reading)[0][0], "HEATER_OFF")
        self.assertEqual(derive_events("OFF", reading), [])


class DeviceListTests(ApiTestBase):
    def test_public_and_no_latest_for_new_device(self):
        response = self.client.get("/api/devices")
        self.assertEqual(response.status_code, 200)
        item = response.json()["data"][0]
        self.assertEqual(item["device_id"], "iceguard-01")
        self.assertIsNone(item["latest"])
        self.assertFalse(item["online"])

    def test_online_after_fresh_reading(self):
        self.post_reading(temp=1.5, hum=86, level="위험", heater=True, state="HEATING", mat_temp=42.1)
        item = self.client.get("/api/devices").json()["data"][0]
        self.assertTrue(item["online"])
        self.assertEqual(item["latest"]["level"], "위험")
        self.assertEqual(item["latest"]["mat_temp"], 42.1)
        self.assertLessEqual(item["latest"]["age_sec"], 2)

    def test_offline_when_stale(self):
        Reading.objects.create(
            device=self.device, ts=now_ms() - 60_000, temp=1, hum=80, level="위험", heater=False, state="OFF"
        )
        item = self.client.get("/api/devices").json()["data"][0]
        self.assertFalse(item["online"])
        self.assertGreaterEqual(item["latest"]["age_sec"], 59)

    def test_latest_is_most_recent(self):
        now = now_ms()
        Reading.objects.create(device=self.device, ts=now - 5000, temp=9, hum=50, level="안전", heater=False, state="OFF")
        Reading.objects.create(device=self.device, ts=now - 1000, temp=3, hum=80, level="주의", heater=False, state="OFF")
        item = self.client.get("/api/devices").json()["data"][0]
        self.assertEqual(item["latest"]["temp"], 3)


class HistoryTests(ApiTestBase):
    def make(self, count, step_ms=1000):
        base = now_ms() - count * step_ms
        Reading.objects.bulk_create(
            Reading(device=self.device, ts=base + i * step_ms, temp=i, hum=50, level="안전", heater=False, state="OFF")
            for i in range(count)
        )

    def test_requires_admin_password(self):
        response = self.client.get("/api/history?device_id=iceguard-01")
        self.assertEqual(response.status_code, 401)

    def test_wrong_password(self):
        response = self.client.get("/api/history?device_id=iceguard-01", HTTP_X_ADMIN_PASSWORD="x")
        self.assertEqual(response.status_code, 401)

    def test_returns_ascending_within_window(self):
        Reading.objects.create(
            device=self.device, ts=now_ms() - 3 * 3600_000, temp=-5, hum=50, level="안전", heater=False, state="OFF"
        )
        self.make(10)
        response = self.client.get("/api/history?device_id=iceguard-01&minutes=30", **ADMIN)
        data = response.json()["data"]
        self.assertEqual(len(data), 10)  # 3시간 전 값은 제외
        self.assertEqual([r["temp"] for r in data], list(range(10)))

    def test_downsamples_to_360(self):
        self.make(1000)
        data = self.client.get("/api/history?device_id=iceguard-01&minutes=60", **ADMIN).json()["data"]
        self.assertEqual(len(data), 360)
        self.assertEqual(data[0]["temp"], 0)
        self.assertEqual(data[-1]["temp"], 999)  # 첫 점과 마지막 점 유지

    def test_unknown_device(self):
        response = self.client.get("/api/history?device_id=ghost", **ADMIN)
        self.assertEqual(response.status_code, 404)

    def test_bad_minutes(self):
        response = self.client.get("/api/history?device_id=iceguard-01&minutes=abc", **ADMIN)
        self.assertEqual(response.status_code, 400)
        response = self.client.get("/api/history?device_id=iceguard-01&minutes=99999", **ADMIN)
        self.assertEqual(response.status_code, 400)

    def test_device_id_required(self):
        self.assertEqual(self.client.get("/api/history", **ADMIN).status_code, 400)


class EventListTests(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.other = Device.objects.create(device_id="iceguard-02", name="구간 B")
        base = now_ms()
        for i in range(5):
            Event.objects.create(device=self.device, ts=base + i, type="HEATER_ON", detail=f"a{i}")
        Event.objects.create(device=self.other, ts=base + 10, type="FAULT", detail="b")

    def test_requires_admin_password(self):
        self.assertEqual(self.client.get("/api/events").status_code, 401)

    def test_all_devices_newest_first(self):
        data = self.client.get("/api/events", **ADMIN).json()["data"]
        self.assertEqual(len(data), 6)
        self.assertEqual(data[0]["type"], "FAULT")
        self.assertEqual(data[0]["device_name"], "구간 B")

    def test_filter_by_device_and_limit(self):
        data = self.client.get("/api/events?device_id=iceguard-01&limit=2", **ADMIN).json()["data"]
        self.assertEqual([e["detail"] for e in data], ["a4", "a3"])

    def test_unknown_device_filter(self):
        self.assertEqual(self.client.get("/api/events?device_id=ghost", **ADMIN).status_code, 404)

    def test_limit_validation(self):
        self.assertEqual(self.client.get("/api/events?limit=0", **ADMIN).status_code, 400)
        self.assertEqual(self.client.get("/api/events?limit=500", **ADMIN).status_code, 400)

    def test_login_check_call_used_by_frontend(self):
        # 프론트 관리자 로그인은 GET /api/events?limit=1 로 비밀번호를 검증한다
        ok = self.client.get("/api/events?limit=1", **ADMIN)
        bad = self.client.get("/api/events?limit=1", HTTP_X_ADMIN_PASSWORD="wrong")
        self.assertEqual((ok.status_code, bad.status_code), (200, 401))

    @override_settings(ADMIN_PASSWORD="")
    def test_empty_admin_password_denies_all(self):
        self.assertEqual(self.client.get("/api/events", HTTP_X_ADMIN_PASSWORD="").status_code, 401)

    def test_throttle_counts_failed_attempts(self):
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {"admin": "3/min"}):
            codes = [
                self.client.get("/api/events?limit=1", HTTP_X_ADMIN_PASSWORD=f"guess{i}").status_code
                for i in range(5)
            ]
            blocked = self.client.get("/api/events?limit=1", **ADMIN)  # 맞는 비밀번호도 제한 중에는 차단
        self.assertEqual(codes, [401, 401, 401, 429, 429])
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.json()["error"], "TOO_MANY_REQUESTS")


class MiscTests(ApiTestBase):
    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "up")

    def test_unknown_path_returns_json_404(self):
        response = self.client.get("/api/nope")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"], "NOT_FOUND")

    def test_wrong_method(self):
        response = self.client.get("/api/readings", **KEY)
        self.assertEqual(response.status_code, 405)
        self.assertEqual(response.json()["error"], "METHOD_NOT_ALLOWED")

    def test_cors_allows_custom_headers(self):
        response = self.client.options(
            "/api/events",
            HTTP_ORIGIN="http://localhost:5173",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="x-admin-password",
        )
        self.assertIn("x-admin-password", response.headers.get("Access-Control-Allow-Headers", ""))

    def test_downsample_keeps_ends(self):
        rows = list(range(1000))
        out = downsample(rows, 360)
        self.assertEqual((len(out), out[0], out[-1]), (360, 0, 999))
        self.assertEqual(downsample(rows[:10], 360), rows[:10])
